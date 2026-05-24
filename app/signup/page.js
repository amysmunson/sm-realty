// Signup Page

import UserRegistration from "@/app/components/forms/UserRegistration";

export const metadata = {
  title: "Sign Up | Shen Munson Realty",
};


export default async function Signup() {
  return (
    // Adjusts for header and takes up full screen height
    <div className="container-page">
      <div className="w-full">
        <UserRegistration />
        <p className="my-4 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500 cursor-pointer">
            Log in here.
          </a>
        </p>
      </div>
    </div>
  );
}
