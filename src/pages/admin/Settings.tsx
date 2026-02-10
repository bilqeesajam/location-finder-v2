import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your admin preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <Card className="p-6 bg-white">
          <h3 className="font-semibold text-lg mb-4 text-gray-600">General Settings</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminName" className="text-gray-500">Admin Name</Label>
              <Input id="adminName" className="bg-transparent text-gray-500" defaultValue="Admin 001" />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-500">Email Notifications</Label>
              <Input id="email" type="email" className="bg-transparent text-gray-500" defaultValue="admin@raeea.com" />
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6 bg-white">
          <h3 className="font-semibold text-lg mb-4 text-gray-600">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pendingNotifications" className="text-gray-500">Pending submissions</Label>
              <Switch id="pendingNotifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="approvalNotifications" className="text-gray-500">Approval notifications</Label>
              <Switch id="approvalNotifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="systemUpdates" className="text-gray-500">System updates</Label>
              <Switch id="systemUpdates" />
            </div>
          </div>
        </Card>

        {/* Platform Settings */}
        <Card className="p-6 md:col-span-2 bg-white">
          <h3 className="font-semibold text-lg mb-4 text-gray-600">Platform Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoApprove" className="text-gray-500">Auto-approve trusted submissions</Label>
                <p className="text-sm text-gray-500">Automatically approve submissions from trusted users</p>
              </div>
              <Switch id="autoApprove" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailVerification" className="text-gray-500">Require email verification</Label>
                <p className="text-sm text-gray-500">Users must verify their email before submitting</p>
              </div>
              <Switch id="emailVerification" defaultChecked />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <Button className="w-full sm:w-auto hover:bg-gray-900" variant="outline">Cancel</Button>
        <Button className="bg-green-700 hover:bg-green-800 w-full sm:w-auto">Save Changes</Button>
      </div>
    </div>
  );
}
