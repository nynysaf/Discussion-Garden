import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

let matcher: RegExpMatcher | null = null;

/** Basic screen before a host sees it; hosts still moderate everything. */
export function containsProfanity(text: string): boolean {
  matcher ??= new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });
  return matcher.hasMatch(text);
}
