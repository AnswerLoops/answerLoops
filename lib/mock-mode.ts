/**
 * When set, all external services (OpenAI, Discord) are replaced with
 * deterministic in-process fakes. Used by the e2e suite so tests are free,
 * offline, and reproducible — never spending tokens or posting to Discord.
 *
 * Enabled by `MOCK_EXTERNALS=1` in the environment.
 */
export const MOCK_EXTERNALS = process.env.MOCK_EXTERNALS === '1'
