import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** One session lookup per request (shared by layout + pages). */
export const getAppSession = cache(() => getServerSession(authOptions));
