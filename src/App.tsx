import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { useState } from "react";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedApp />
      </Unauthenticated>
      <Toaster position="top-center" />
    </div>
  );
}

function AuthenticatedApp() {
  return <Dashboard />;
}

function UnauthenticatedApp() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-orange-200 shadow-sm px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">📖</span>
          </div>
          <h2 className="text-xl font-semibold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
            DayShare
          </h2>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-white text-3xl">📖</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Welcome to DayShare
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Share your daily moments with close friends
            </p>
            <p className="text-sm text-gray-500">
              Experience the joy of Japanese-style exchange diaries
            </p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-200">
            <SignInForm />
          </div>
        </div>
      </main>
    </div>
  );
}
