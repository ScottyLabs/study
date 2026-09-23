import "server-only";
import { Client } from "ldapts";


export type DirectoryCheckResult = "ELIGIBLE" | "INELIGIBLE" | "UNAVAILABLE";

type FetchFunction = typeof fetch;

const client = new Client({
  url: "ldaps://ldap.cmu.edu:636",
});

/**
 * Checks CMU Directory using the same request and student marker as the retired
 * Firebase helper. Only a positive student marker grants access.
 */
export async function checkDirectoryEligibility(
  andrewID: string,
): Promise<DirectoryCheckResult> {
  try {
    const { searchEntries } = await client.search("", {
      scope: "sub",
      filter: `(uid=${andrewID})`,
    });

    if (!searchEntries || searchEntries.length < 1 || !searchEntries[0]) {
      return "UNAVAILABLE";
    }
    if (!searchEntries[0]["eduPersonPrimaryAffiliation"]) {
      return "UNAVAILABLE"
    }
    if (searchEntries[0]["eduPersonPrimaryAffiliation"] === "Student") {
      return "ELIGIBLE"
    } else {
      return "INELIGIBLE"
    }
  } finally {
    await client.unbind();
  }
}
