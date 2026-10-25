import { string } from "better-auth";
import CardSkeleton from "./CardSkeleton";

const CardPlaceHolder: { title: string; purpose: string; num: number }[] = [
  { purpose: "aaaaaaaaaaaaaaaaaaaaaaaaaaa", title: "group.titleaaaaaa", num:4 },
  { purpose: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", title: "group.tiaaaaaa", num:3  },
  { purpose: "aaaaaaaaaaaaasaseaaaaaaaaa", title: "group.titleweaaaaaaa", num:3  },
  { purpose: "aaaaaaaaaaaaaaaaaaaaaa", title: "group.titleeeaaaaaaaa", num:2  },
  {
    purpose: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    title: "group.titleeeeeeeaaaaaa",
     num:4
  },
  { purpose: "aaaaaaaaaaaaaaaaaaaaaaa", title: "group.titleaaaaaaaaa", num:2  },
];

export default function CardSkeletonGroup() {
  return CardPlaceHolder.map((e) => <CardSkeleton {...e} />);
}
