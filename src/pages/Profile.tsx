import React from "react";
import { ThumbsUp, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom"; // Add this import

const mockProfile = {
  name: "Shigebunz",
  email: "Shigebunz@gmail.com",
  location: "India, Trumps house",
  locations: [
    {
      id: "1",
      name: "Control Paris",
      description: "Beautiful green space in the city",
    },
    {
      id: "2",
      name: "Coffee Shop Corner",
      description: "Local cafe with great coffee",
    },
    { id: "3", name: "Old Treater", description: "Historic theater building" },
  ],
};

const ProfilePage = () => {
  const navigate = useNavigate(); // Add this hook

  return (
    <div className="min-h-screen bg-white">
      <div className="relative w-full">
        <div className="bg-[#009E61] h-40">
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
                  {mockProfile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {mockProfile.name}
            </h1>
            <p className="text-sm text-gray-600 mb-3">{mockProfile.email}</p>
            <div className="flex items-center justify-center gap-1.5 text-gray-600">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span className="text-sm">{mockProfile.location}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            <button className="px-4 py-1.5 text-base bg-gray-900 text-white rounded-md hover:bg-gray-800 transition focus:outline-none">
              Edit profile
            </button>
            <button className="px-4 py-1.5 text-base bg-gray-900 text-white rounded-md hover:bg-gray-800 transition">
              Save Locations
            </button>
          </div>

          <div className="text-center mb-4 pb-4 border-b-2 border-gray-900">
            <h2 className="text-base font-semibold text-gray-900">
              Your Locations
            </h2>
            <p className="text-xs text-gray-900 mt-0.5">
              All locations you've submitted
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-[#e9edc9]">
            <div className="divide-y divide-gray-900">
              {mockProfile.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-start justify-between py-3"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {location.name}
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {location.description}
                    </p>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>


          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition focus:outline-none"
            >
              Back to Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;