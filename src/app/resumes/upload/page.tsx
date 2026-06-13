import { redirect } from "next/navigation";

export default function ResumeUploadRedirectPage() {
  redirect("/resume?import=1");
}
