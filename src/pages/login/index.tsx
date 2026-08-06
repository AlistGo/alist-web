import {
  Center,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  useColorModeValue,
  HStack,
  VStack,
  Checkbox,
  Icon,
  Divider,
  Image,
  IconButton,
  Box,
} from "@hope-ui/solid"
import { FiUser, FiLock, FiEye, FiEyeOff } from "solid-icons/fi"
import { createMemo, createSignal, Show, onMount, onCleanup } from "solid-js"
import { SwitchColorMode, SwitchLanguageWhite } from "~/components"
import { useFetch, useT, useTitle, useRouter } from "~/hooks"
import {
  changeToken,
  r,
  notify,
  handleRespWithoutNotify,
  base_path,
  handleResp,
  hashPwd,
  joinBase,
  separatorColor,
} from "~/utils"
import { PResp, Resp } from "~/types"
import LoginBg from "./LoginBg"
import { createStorageSignal } from "@solid-primitives/storage"
import { getSetting, getSettingBool, setSettings } from "~/store"
import { SSOLogin } from "./SSOLogin"
import { IoFingerPrint } from "solid-icons/io"
import { register } from "~/utils/api"
import {
  parseRequestOptionsFromJSON,
  get,
  AuthenticationPublicKeyCredential,
  supported,
  CredentialRequestOptionsJSON,
} from "@github/webauthn-json/browser-ponyfill"

const Login = () => {
  const t = useT()
  const usertitle = createMemo(() => {
    return `${t("login.login_to")} ${getSetting("site_title")}`
  })
  useTitle(usertitle)
  const bgColor = useColorModeValue("white", "$neutral1")
  const [username, setUsername] = createSignal(
    localStorage.getItem("username") || "",
  )
  const [password, setPassword] = createSignal(
    localStorage.getItem("password") || "",
  )
  const [showPassword, setShowPassword] = createSignal(false)
  const [opt, setOpt] = createSignal("")
  const [useauthn, setuseauthn] = createSignal(false)
  const [remember, setRemember] = createStorageSignal("remember-pwd", "false")
  const [useLdap, setUseLdap] = createSignal(false)
  const [isRegisterMode, setIsRegisterMode] = createSignal(false)

  // 切换注册模式时清空输入框
  const toggleRegisterMode = () => {
    if (!isRegisterMode()) {
      // 切换到注册模式时清空输入框
      setUsername("")
      setPassword("")
    } else {
      // 切换回登录模式时恢复记住的账号密码
      const savedUsername = localStorage.getItem("username") || ""
      const savedPassword = localStorage.getItem("password") || ""
      setUsername(savedUsername)
      setPassword(savedPassword)
    }
    setIsRegisterMode(!isRegisterMode())
  }

  // 获取最新的设置数据
  const [settingsLoading, getSettings] = useFetch(
    (): Promise<Resp<Record<string, string>>> => r.get("/public/settings"),
  )

  // 刷新设置数据
  const refreshSettings = async () => {
    const resp = await getSettings()
    handleResp(resp, (data) => {
      setSettings(data)
    })
  }

  // 使用 public/settings 接口中的 use_newui 字段
  const useNewVersion = createMemo(() => getSetting("use_newui") === "true")
  const allowRegister = createMemo(
    () => getSetting("allow_register") === "true",
  )

  // 页面加载时刷新设置
  onMount(() => {
    refreshSettings()
  })

  const [loading, data] = useFetch(
    async (): Promise<Resp<{ token: string; device_key?: string }>> => {
      if (useLdap()) {
        return r.post("/auth/login/ldap", {
          username: username(),
          password: password(),
          otp_code: opt(),
        })
      } else {
        return r.post("/auth/login/hash", {
          username: username(),
          password: hashPwd(password()),
          otp_code: opt(),
        })
      }
    },
  )

  // 注册接口
  const [registerLoading, registerData] = useFetch(
    async (): Promise<Resp<any>> => {
      return register({
        username: username(),
        password: password(),
      })
    },
  )
  const [, postauthnlogin] = useFetch(
    (
      session: string,
      credentials: AuthenticationPublicKeyCredential,
      username: string,
      signal: AbortSignal | undefined,
    ): Promise<Resp<{ token: string; device_key?: string }>> =>
      r.post(
        "/authn/webauthn_finish_login?username=" + username,
        JSON.stringify(credentials),
        {
          headers: {
            session: session,
          },
          signal,
        },
      ),
  )
  interface Webauthntemp {
    session: string
    options: CredentialRequestOptionsJSON
  }
  const [, getauthntemp] = useFetch(
    (username, signal: AbortSignal | undefined): PResp<Webauthntemp> =>
      r.get("/authn/webauthn_begin_login?username=" + username, {
        signal,
      }),
  )
  const { searchParams, to } = useRouter()
  const isAuthnConditionalAvailable = async (): Promise<boolean> => {
    if (
      PublicKeyCredential &&
      "isConditionalMediationAvailable" in PublicKeyCredential
    ) {
      return await PublicKeyCredential.isConditionalMediationAvailable()
    } else {
      return false
    }
  }
  const AuthnSignEnabled = getSettingBool("webauthn_login_enabled")
  const AuthnSwitch = async () => {
    setuseauthn(!useauthn())
  }
  let AuthnSignal: AbortController | null = null
  const AuthnLogin = async (conditional?: boolean) => {
    if (!supported()) {
      if (!conditional) {
        notify.error(t("users.webauthn_not_supported"))
      }
      return
    }
    if (conditional && !(await isAuthnConditionalAvailable())) {
      return
    }
    AuthnSignal?.abort()
    const controller = new AbortController()
    AuthnSignal = controller
    const username_login: string = conditional ? "" : username()
    if (!conditional && remember() === "true") {
      localStorage.setItem("username", username())
    } else {
      localStorage.removeItem("username")
    }
    const resp = await getauthntemp(username_login, controller.signal)
    handleResp(resp, async (data) => {
      try {
        const options = parseRequestOptionsFromJSON(data.options)
        options.signal = controller.signal
        if (conditional) {
          options.mediation = "conditional"
        }
        const credentials = await get(options)
        const resp = await postauthnlogin(
          data.session,
          credentials,
          username_login,
          controller.signal,
        )
        handleRespWithoutNotify(resp, (data) => {
          notify.success(t("login.success"))
          changeToken(data.token)
          // 保存 device_key 到 localStorage
          if (data.device_key) {
            localStorage.setItem("device_key", data.device_key)
            console.log("=== Login Debug (Hash) ===")
            console.log("Saved device_key:", data.device_key)
            console.log("Full response data:", data)
            console.log("========================")
          } else {
            console.log("=== Login Debug (Hash) ===")
            console.log("No device_key in response")
            console.log("Full response data:", data)
            console.log("========================")
          }
          to(
            decodeURIComponent(searchParams.redirect || base_path || "/"),
            true,
          )
        })
      } catch (error: unknown) {
        if (error instanceof Error && error.name != "AbortError")
          notify.error(error.message)
      }
    })
  }
  const AuthnCleanUpHandler = () => AuthnSignal?.abort()
  onMount(() => {
    if (AuthnSignEnabled) {
      window.addEventListener("beforeunload", AuthnCleanUpHandler)
      AuthnLogin(true)
    }
  })
  onCleanup(() => {
    AuthnSignal?.abort()
    window.removeEventListener("beforeunload", AuthnCleanUpHandler)
  })

  const Login = async () => {
    if (isRegisterMode()) {
      // 注册模式
      const resp = await registerData()
      handleRespWithoutNotify(
        resp,
        (data) => {
          notify.success(t("login.register_success"))
          // 注册成功后切换到登录模式
          setIsRegisterMode(false)
          // 清空密码，保留用户名
          setPassword("")
        },
        (msg, code) => {
          if (code === 403) {
            notify.error(t("login.register_disabled"))
          } else {
            notify.error(msg)
          }
        },
      )
    } else {
      // 登录模式
      if (!useauthn()) {
        if (remember() === "true") {
          localStorage.setItem("username", username())
          localStorage.setItem("password", password())
        } else {
          localStorage.removeItem("username")
          localStorage.removeItem("password")
        }
        const resp = await data()
        handleRespWithoutNotify(
          resp,
          (data) => {
            notify.success(t("login.success"))
            changeToken(data.token)
            // 保存 device_key 到 localStorage
            if (data.device_key) {
              localStorage.setItem("device_key", data.device_key)
              console.log("=== Login Debug ===")
              console.log("Saved device_key:", data.device_key)
              console.log("Full response data:", data)
              console.log("==================")
            } else {
              console.log("=== Login Debug ===")
              console.log("No device_key in response")
              console.log("Full response data:", data)
              console.log("==================")
            }
            to(
              decodeURIComponent(searchParams.redirect || base_path || "/"),
              true,
            )
          },
          (msg, code) => {
            if (!needOpt() && code === 402) {
              setNeedOpt(true)
            } else {
              notify.error(msg)
            }
          },
        )
      } else {
        await AuthnLogin()
      }
    }
  }
  const [needOpt, setNeedOpt] = createSignal(false)
  const ldapLoginEnabled = getSettingBool("ldap_login_enabled")
  const ldapLoginTips = getSetting("ldap_login_tips")
  if (ldapLoginEnabled) {
    setUseLdap(true)
  }

  const title = () => t("login.password_login")
  const logo = () => getSetting("logo").split("\n")[0]

  return (
    <Center zIndex="1" w="$full" h="100vh">
      <VStack spacing="$6" alignItems="center">
        <Show when={useNewVersion()}>
          <HStack alignItems="center" spacing="$2">
            <Image
              w="151px"
              h="auto"
              src={
                getSetting("logo").split("\n")[0] ===
                "https://cdn.jsdelivr.net/gh/alist-org/logo@main/logo.svg"
                  ? joinBase("/images/new_icon.png")
                  : getSetting("logo").split("\n")[0]
              }
              alt="AList Logo"
            />
          </HStack>
        </Show>

        <Show
          when={useNewVersion()}
          fallback={
            <VStack
              bgColor={bgColor()}
              rounded="$xl"
              p="24px"
              w={{
                "@initial": "90%",
                "@sm": "364px",
              }}
              spacing="$4"
            >
              <Flex alignItems="center" justifyContent="space-around">
                <Image mr="$2" boxSize="$12" src={logo()} />
                <Heading color="$info9" fontSize="$2xl">
                  {isRegisterMode() ? t("login.register") : title()}
                </Heading>
              </Flex>
              <Show
                when={!needOpt()}
                fallback={
                  <Input
                    id="totp"
                    name="otp"
                    placeholder={t("login.otp-tips")}
                    value={opt()}
                    onInput={(e) => setOpt(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        Login()
                      }
                    }}
                  />
                }
              >
                <Input
                  name="username"
                  placeholder={t("login.username-tips")}
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                />
                <Show when={!useauthn()}>
                  <Input
                    name="password"
                    placeholder={t("login.password-tips")}
                    type="password"
                    value={password()}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        Login()
                      }
                    }}
                  />
                </Show>
                <Flex
                  px="$1"
                  w="$full"
                  fontSize="$sm"
                  color="$neutral10"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Checkbox
                    checked={remember() === "true"}
                    onChange={() =>
                      setRemember(remember() === "true" ? "false" : "true")
                    }
                  >
                    {t("login.remember")}
                  </Checkbox>
                  <Show when={!isRegisterMode()}>
                    <Text as="a" target="_blank" href={t("login.forget_url")}>
                      {t("login.forget")}
                    </Text>
                  </Show>
                  <Show when={isRegisterMode()}>
                    <Text
                      as="a"
                      onClick={toggleRegisterMode}
                      cursor="pointer"
                      _hover={{
                        textDecoration: "underline",
                        color: "$primary10",
                      }}
                      color="$primary9"
                    >
                      {t("login.go_login")}
                    </Text>
                  </Show>
                </Flex>
              </Show>
              <HStack w="$full" spacing="$2">
                <Show when={!useauthn()}>
                  <Button
                    colorScheme="primary"
                    w="$full"
                    onClick={() => {
                      if (needOpt()) {
                        setOpt("")
                      } else {
                        setUsername("")
                        setPassword("")
                      }
                    }}
                  >
                    {t("login.clear")}
                  </Button>
                </Show>
                <Button
                  w="$full"
                  loading={loading() || registerLoading()}
                  onClick={Login}
                >
                  {isRegisterMode() ? t("login.register") : t("login.login")}
                </Button>
              </HStack>
              <Show when={ldapLoginEnabled}>
                <Checkbox
                  w="$full"
                  checked={useLdap() === true}
                  onChange={() => setUseLdap(!useLdap())}
                >
                  {ldapLoginTips}
                </Checkbox>
              </Show>
              <Button
                w="$full"
                colorScheme="accent"
                onClick={() => {
                  changeToken()
                  to(
                    decodeURIComponent(
                      searchParams.redirect || base_path || "/",
                    ),
                    true,
                  )
                }}
              >
                {t("login.use_guest")}
              </Button>
              {/* 注册切换 */}
              <Show when={!isRegisterMode() && allowRegister()}>
                <Button w="$full" variant="subtle" onClick={toggleRegisterMode}>
                  {t("login.register")}
                </Button>
              </Show>
              <Flex
                mt="$2"
                justifyContent="space-evenly"
                alignItems="center"
                color="$neutral10"
                w="$full"
              >
                <SwitchLanguageWhite />
                <SwitchColorMode />
                <SSOLogin />
                <Show when={AuthnSignEnabled}>
                  <Icon
                    cursor="pointer"
                    boxSize="$8"
                    as={IoFingerPrint}
                    p="$0_5"
                    onclick={AuthnSwitch}
                  />
                </Show>
              </Flex>
            </VStack>
          }
        >
          {/* 新版本的登录表单 */}
          <VStack
            bgColor={bgColor()}
            rounded="$xl"
            p="24px"
            w={{
              "@initial": "90%",
              "@sm": "420px",
            }}
            spacing="$4"
          >
            <Flex alignItems="center" justifyContent="center">
              <Heading color="$primary9" fontSize="$lg" fontWeight={600}>
                {isRegisterMode()
                  ? t("login.register")
                  : t("login.password_login")}
              </Heading>
            </Flex>
            <Divider borderColor={separatorColor()} />
            <Show
              when={!needOpt()}
              fallback={
                <Input
                  id="totp"
                  name="otp"
                  placeholder={t("login.otp-tips")}
                  value={opt()}
                  onInput={(e) => setOpt(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      Login()
                    }
                  }}
                />
              }
            >
              <HStack
                w="$full"
                border="1px solid"
                borderColor="$neutral6"
                borderRadius="12px"
                px="$3"
                spacing="$2"
                alignItems="center"
                _focusWithin={{
                  borderColor: "$primary6",
                  boxShadow: "0 0 0 1px $colors$primary6",
                }}
              >
                <Icon as={FiUser} color="$neutral8" boxSize="$5" />
                <Input
                  name="username"
                  placeholder={t("login.username-tips")}
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                  border="none"
                  backgroundColor="transparent"
                  _focus={{
                    border: "none",
                    boxShadow: "none",
                    backgroundColor: "transparent",
                  }}
                  _hover={{
                    border: "none",
                    boxShadow: "none",
                    backgroundColor: "transparent",
                  }}
                  flex={1}
                />
              </HStack>
              <Show when={!useauthn()}>
                <HStack
                  w="$full"
                  border="1px solid"
                  borderColor="$neutral6"
                  borderRadius="12px"
                  px="$3"
                  spacing="$2"
                  alignItems="center"
                  _focusWithin={{
                    borderColor: "$primary6",
                    boxShadow: "0 0 0 1px $colors$primary6",
                  }}
                >
                  <Icon as={FiLock} color="$neutral8" boxSize="$5" />
                  <Input
                    name="password"
                    placeholder={t("login.password-tips")}
                    type={showPassword() ? "text" : "password"}
                    value={password()}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        Login()
                      }
                    }}
                    border="none"
                    backgroundColor="transparent"
                    _focus={{
                      border: "none",
                      boxShadow: "none",
                      backgroundColor: "transparent",
                    }}
                    _hover={{
                      border: "none",
                      boxShadow: "none",
                      backgroundColor: "transparent",
                    }}
                    flex={1}
                  />
                  <IconButton
                    size="md"
                    variant="ghost"
                    icon={showPassword() ? <FiEyeOff /> : <FiEye />}
                    onClick={() => setShowPassword(!showPassword())}
                    color="$neutral8"
                    aria-label={showPassword() ? "隐藏密码" : "显示密码"}
                    _hover={{
                      backgroundColor: "$neutral3",
                    }}
                  />
                </HStack>
              </Show>
              {/* 新版本忘记密码 */}
              <Show when={!isRegisterMode()}>
                <Flex
                  px="$1"
                  w="$full"
                  fontSize="$sm"
                  color="$neutral10"
                  justifyContent="flex-end"
                  alignItems="center"
                >
                  <Text as="a" target="_blank" href={t("login.forget_url")}>
                    {t("login.forget")}
                  </Text>
                </Flex>
              </Show>
            </Show>
            <VStack w="$full" spacing="$4">
              <Button
                w="$full"
                loading={loading() || registerLoading()}
                onClick={Login}
                h="45px"
                fontSize="$md"
                fontWeight={600}
                mt="$2"
              >
                {isRegisterMode() ? t("login.register") : t("login.login")}
              </Button>

              <HStack
                w="$full"
                justifyContent="space-between"
                alignItems="center"
              >
                <Show when={allowRegister()}>
                  <Text
                    color="$primary9"
                    fontSize="$sm"
                    cursor="pointer"
                    onClick={toggleRegisterMode}
                    _hover={{
                      textDecoration: "underline",
                      color: "$primary10",
                    }}
                  >
                    {isRegisterMode()
                      ? t("login.go_login")
                      : t("login.register")}
                  </Text>
                </Show>
                <Text
                  as="a"
                  onClick={() => {
                    changeToken()
                    to(
                      decodeURIComponent(
                        searchParams.redirect || base_path || "/",
                      ),
                      true,
                    )
                  }}
                  color="$primary9"
                  fontSize="$sm"
                  cursor="pointer"
                  _hover={{
                    textDecoration: "underline",
                    color: "$primary10",
                  }}
                >
                  {t("login.use_guest")}
                </Text>
              </HStack>
            </VStack>
            <Flex
              mt="$2"
              justifyContent="space-evenly"
              alignItems="center"
              color="$neutral10"
              w="$full"
            >
              <SwitchLanguageWhite />
              <SwitchColorMode />
              <SSOLogin />
              <Show when={AuthnSignEnabled}>
                <Icon
                  cursor="pointer"
                  boxSize="$8"
                  as={IoFingerPrint}
                  p="$0_5"
                  onclick={AuthnSwitch}
                />
              </Show>
            </Flex>
          </VStack>
        </Show>
      </VStack>
      <LoginBg useNewVersion={useNewVersion()} />
    </Center>
  )
}

export default Login
