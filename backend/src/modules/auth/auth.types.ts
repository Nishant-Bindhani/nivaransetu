export type RegisterInput = {
  email: string
  password: string
  name: string
}

export type LoginInput = {
  email: string
  password: string
}

export type GoogleTokenResponse = {
  access_token: string
}

export type GoogleProfile = {
  sub: string
  email: string
  email_verified: boolean
  name: string
}
