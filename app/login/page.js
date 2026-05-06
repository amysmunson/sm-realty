// Login Page 
import UserLogin from "@/app/components/UserLogin";

export const metadata = {
  title: "Login | Shen Munson Realty",
};

export default async function Login() {
  return (
    <div>
      <UserLogin />
      <p className="mt-4 mb-20 text-center">
        Don't have an account?{" "}
        <a href="/signup" className="text-blue-500 cursor-pointer">
          Sign up here.
        </a>
      </p>
    </div>
  );
}
