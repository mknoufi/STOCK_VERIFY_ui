/**
 * Staff Index - Default route redirects to home
 */

import { Redirect } from "expo-router";

export default function StaffIndex() {
  return <Redirect href="/staff/home" />;
}
