import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your admin preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminName">Admin Name</Label>
              <Input id="adminName" defaultValue="Admin 001" />
            </div>
            <div>
              <Label htmlFor="email">Email Notifications</Label>
              <Input id="email" type="email" defaultValue="admin@raeea.com" />
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pendingNotifications">Pending submissions</Label>
              <Switch id="pendingNotifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="approvalNotifications">Approval notifications</Label>
              <Switch id="approvalNotifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="systemUpdates">System updates</Label>
              <Switch id="systemUpdates" />
            </div>
          </div>
        </Card>

        {/* Platform Settings */}
        <Card className="p-6 md:col-span-2">
          <h3 className="font-semibold text-lg mb-4">Platform Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoApprove">Auto-approve trusted submissions</Label>
                <p className="text-sm text-gray-500">Automatically approve submissions from trusted users</p>
              </div>
              <Switch id="autoApprove" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailVerification">Require email verification</Label>
                <p className="text-sm text-gray-500">Users must verify their email before submitting</p>
              </div>
              <Switch id="emailVerification" defaultChecked />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
      </div>
    </div>
  );
}