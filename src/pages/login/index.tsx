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
} from "~/utils"
import { PResp, Resp } from "~/types"
import LoginBg from "./LoginBg"
import { createStorageSignal } from "@solid-primitives/storage"
import { getSetting, getSettingBool } from "~/store"
import { SSOLogin } from "./SSOLogin"
import { IoFingerPrint } from "solid-icons/io"
import {
  parseRequestOptionsFromJSON,
  get,
  AuthenticationPublicKeyCredential,
  supported,
  CredentialRequestOptionsJSON,
} from "@github/webauthn-json/browser-ponyfill"

const Login = () => {
  const t = useT()
  useTitle(t("login.password_login"))
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
  const [loading, data] = useFetch(
    async (): Promise<Resp<{ token: string }>> => {
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
  const [, postauthnlogin] = useFetch(
    (
      session: string,
      credentials: AuthenticationPublicKeyCredential,
      username: string,
      signal: AbortSignal | undefined,
    ): Promise<Resp<{ token: string }>> =>
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
      // @ts-expect-error
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
          // @ts-expect-error
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
  const [needOpt, setNeedOpt] = createSignal(false)
  const ldapLoginEnabled = getSettingBool("ldap_login_enabled")
  const ldapLoginTips = getSetting("ldap_login_tips")
  if (ldapLoginEnabled) {
    setUseLdap(true)
  }

  return (
    <Center zIndex="1" w="$full" h="100vh">
      <VStack spacing="$6" alignItems="center">
        {/* AList Logo and Text */}
        <HStack alignItems="center" spacing="$2">
          <Image
            boxSize="$10"
            src={getSetting("logo").split("\n")[0]}
            alt="AList Logo"
          />
          <Heading color="#3573FF" fontSize="42px" fontWeight="bold">
            AList
          </Heading>
        </HStack>

        {/* Login Form Container */}
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
            <Heading color="#3573FF" fontSize="18px">
              {t("login.password_login")}
            </Heading>
          </Flex>
          <Divider borderColor="#E9E9E9" />
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
              // bgColor="$neutral2"
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
                bgColor="transparent"
                _focus={{
                  border: "none",
                  boxShadow: "none",
                  bgColor: "transparent",
                }}
                _hover={{
                  border: "none",
                  boxShadow: "none",
                  bgColor: "transparent",
                }}
                flex={1}
              />
            </HStack>
            <Show when={!useauthn()}>
              <HStack
                w="$full"
                // bgColor="$neutral2"
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
                  bgColor="transparent"
                  _focus={{
                    border: "none",
                    boxShadow: "none",
                    bgColor: "transparent",
                  }}
                  _hover={{
                    border: "none",
                    boxShadow: "none",
                    bgColor: "transparent",
                  }}
                  flex={1}
                />
                <IconButton
                  size="md"
                  variant="ghost"
                  icon={showPassword() ? <FiEyeOff /> : <FiEye />}
                  onClick={() => setShowPassword(!showPassword())}
                  color="$neutral8"
                  aria-label={
                    showPassword()
                      ? t("login.hide_password")
                      : t("login.show_password")
                  }
                  _hover={{
                    backgroundColor: "$neutral3",
                  }}
                />
              </HStack>
            </Show>
          </Show>
          <VStack w="$full" spacing="$4">
            <Button
              w="$full"
              loading={loading()}
              onClick={Login}
              bgColor="#3573FF"
              color="white"
              _hover={{
                backgroundColor: "#2B5CD9",
              }}
              _active={{
                backgroundColor: "#1E40AF",
              }}
              h="45px"
              fontSize="16px"
              fontWeight="bold"
              borderRadius="12px"
              mt="$5"
            >
              {t("login.login")}
            </Button>

            <HStack
              w="$full"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text
                as="a"
                target="_blank"
                href={t("login.forget_url")}
                color="#3573FF"
                fontSize="14px"
                cursor="pointer"
                _hover={{
                  textDecoration: "underline",
                }}
              >
                {t("login.forget")}
              </Text>
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
                color="#3573FF"
                fontSize="14px"
                cursor="pointer"
                _hover={{
                  textDecoration: "underline",
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
      </VStack>
      <LoginBg />
    </Center>
  )
}

export default Login
