import React, { useState } from "react";
import { MapPin, X, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLocations } from "@/hooks/useLocations";

const ACCENT = '#009E61';
const cn = (...classes) => classes.filter(Boolean).join(' ');

const ProfilePage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { userLocations } = useLocations();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavedLocationsModalOpen, setIsSavedLocationsModalOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Filter approved locations
  const approvedLocations = userLocations.filter(loc => loc.status === 'approved');

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setFormData({
      name: "",
      email: "",
      password: "",
    });
  };

  const handleSavedLocationsClick = () => {
    setIsSavedLocationsModalOpen(true);
  };

  const handleCloseSavedLocationsModal = () => {
    setIsSavedLocationsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Updating profile with:", formData);
    // TODO: Implement profile update with backend
    handleCloseEditModal();
    alert("Profile updated successfully!");
  };

  const handleSelectLocation = (locationId) => {
    setSelectedLocationId(locationId);
    console.log("Selected location:", locationId);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Profile
              </h2>
              <button
                onClick={handleCloseEditModal}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#009E61] focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#009E61] focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#009E61] focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="Enter new password (leave blank to keep current)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave password field empty if you don't want to change it
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#009E61] text-white rounded-md hover:bg-[#008c55] transition focus:outline-none"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Locations Modal - Shows only approved locations */}
      {isSavedLocationsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Saved Locations ({approvedLocations.length})
              </h2>
              <button
                onClick={handleCloseSavedLocationsModal}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {approvedLocations.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {approvedLocations.map((location) => (
                    <div
                      key={location.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-sm">
                            {location.name}
                          </h3>
                          {location.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {location.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                              Approved
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <MapPin className="w-12 h-12 mx-auto" />
                  </div>
                  <p className="text-gray-600">
                    No approved locations yet
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Your submitted locations will appear here once approved
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <button
                type="button"
                onClick={handleCloseSavedLocationsModal}
                className="w-full px-4 py-2 bg-[#009E61] text-white rounded-md hover:bg-[#008c55] transition focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full">
        <div className="bg-[#009E61] h-40">
          <div className="absolute top-4 left-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white rounded-md hover:bg-white/30 transition focus:outline-none backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-center pt-6">
            <span className="text-white text-2xl font-bold italic">Findr</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-3 sm:h-8 overflow-hidden translate-y-[99%]">
          <svg
            className="absolute bottom-0 w-full"
            viewBox="0 0 1440 60"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 L0,30 Q720,60 1440,30 L1440,0 Z"
              className="fill-[#009E61]"
            />
          </svg>
        </div>
      </div>

      <div className="relative px-5 -mt-14 pb-8">
        <div className="max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-28 h-28 border-4 border-white bg-gray-300 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-gray-800 text-2xl font-semibold">
                  {user?.user_metadata?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {user?.user_metadata?.name || "User"}
            </h1>
            <p className="text-sm text-gray-600 mb-3">{user?.email || ""}</p>
            <div className="flex items-center justify-center gap-1.5 text-gray-600">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span className="text-sm">{user?.user_metadata?.location || "Location not set"}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            <button
              onClick={handleEditClick}
              className="px-4 py-1.5 text-base bg-[#009E61] text-white rounded-md hover:bg-[#008c55] transition focus:outline-none"
            >
              Edit profile
            </button>
            <button 
              onClick={handleSavedLocationsClick}
              className="px-4 py-1.5 text-base bg-[#009E61] text-white rounded-md hover:bg-[#008c55] transition focus:outline-none"
            >
              Saved Locations
            </button>
          </div>

          <div className="text-center mb-4 pb-4 border-b-2 border-gray-900">
            <h2 className="text-base font-semibold text-gray-900">
              Your Locations
            </h2>
 <p className="text-xs text-gray-900 mt-0.5">
  {userLocations.length} locations you've submitted with descriptions
</p>
</div>



      {/* Full Locations List */}
      <div className="p-4 bg-gray-100 rounded-lg border border-gray-400 max-w-md mx-auto">
        <div className="divide-y divide-gray-900">
          {userLocations.map((location) => (
            <div
              key={location.id}
              className="flex items-start justify-between py-3"
            >
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  {location.name}
                </h4>
                {location.description && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {location.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${location.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {location.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    : (
    </div>
  )
</div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition focus:outline-none"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
  );
};

export default ProfilePage;