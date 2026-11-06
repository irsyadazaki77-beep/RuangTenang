export function isLocalDevelopmentOrTest(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function isProductionLikeEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

