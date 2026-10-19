/**
 * After the festival the public site is an archive/portfolio.
 * Spendy live tools stay off unless FESTIVAL_LIVE=true.
 */
export function isFestivalLive(): boolean {
  return process.env.FESTIVAL_LIVE === "true";
}

export const FESTIVAL_ENDED_MESSAGE =
  "The Discussion Garden festival weekend has ended. This site is now a public archive — explore the garden of ideas instead.";
