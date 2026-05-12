// Signup Page

import UserRegistration from "@/app/components/forms/UserRegistration";

export const metadata = {
  title: "Sign Up | Shen Munson Realty",
};


export default async function Signup() {
  return (
    <div>
        <UserRegistration />
        <p className="mt-4 mb-20 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500 cursor-pointer">
            Log in here. 
          </a>
        </p>
    </div>
  );
}
