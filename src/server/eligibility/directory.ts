import "server-only";
import { Client } from "ldapts";

export type DirectoryCheckResult = "ELIGIBLE" | "INELIGIBLE" | "UNAVAILABLE";

const client = new Client({
  url: "ldaps://ldap.cmu.edu:636",
});

/**
 * Checks CMU Directory using the same request and student marker as the retired
 * Firebase helper. Only a positive student marker grants access.
 */
export async function checkDirectoryEligibility(andrewID: string): Promise<DirectoryCheckResult> {
  try {
    const { searchEntries } = await client.search("", {
      scope: "sub",
      filter: `(uid=${andrewID})`,
    });

    const affiliation = searchEntries[0]?.["eduPersonPrimaryAffiliation"];
    if (affiliation === undefined || affiliation === "") return "UNAVAILABLE";
    return affiliation === "Student" ? "ELIGIBLE" : "INELIGIBLE";
  } finally {
    await client.unbind();
  }
}
