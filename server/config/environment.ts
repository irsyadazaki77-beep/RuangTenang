export function isLocalDevelopmentOrTest(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

export function isProductionLikeEnvironment(): boolean {
  return !isLocalDevelopmentOrTest();
}
