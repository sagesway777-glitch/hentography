import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export const metadata = {
  title: "Settings | Dashboard | Hentography",
};

export default function SettingsPage() {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Manage your preferences and profile details</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <UserProfile 
          appearance={{
            elements: {
              cardBox: "shadow-none border border-slate-800 bg-slate-950",
              navbar: "hidden md:block",
              pageScrollBox: "px-0 md:px-6",
            }
          }}
          routing="hash"
        />
      </CardContent>
    </Card>
  );
}
