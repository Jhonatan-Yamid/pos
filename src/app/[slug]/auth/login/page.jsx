"use client";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { use } from "react";

/**
 * Tenant-scoped login page at /[slug]/auth/login.
 *
 * Passes `slug` as an extra credentials field so authorize() can resolve
 * the correct tenant DB. Uses next-auth/react's signIn with redirect:false
 * so we control navigation on success.
 *
 * Requirements: 5.1, 6.1
 */
function LoginPage({ params }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const slug = resolvedParams?.slug ?? "";

  const { register, handleSubmit, formState: { errors } } = useForm();
  const router  = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    setError(null);

    const callbackUrl = `/${slug}/dashboard`;

    const res = await signIn("credentials", {
      email:    data.email,
      password: data.password,
      slug,
      redirect:    false,
      callbackUrl,
    });

    setLoading(false);

    if (res?.error) {
      setError("Credenciales inválidas");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  });

  return (
    <div className="h-[calc(100vh-7rem)] flex justify-center items-center">
      <form onSubmit={onSubmit} className="w-full md:w-1/2 lg:w-1/4 p-4">
        {error && (
          <p className="bg-red-500 text-lg text-white p-3 rounded mb-2">
            {error}
          </p>
        )}

        <h1 className="text-slate-200 font-bold text-4xl mb-4 text-center">
          Login
        </h1>

        <label htmlFor="email" className="text-slate-500 mb-2 block text-sm">
          Email:
        </label>
        <input
          id="email"
          type="email"
          {...register("email", {
            required: { value: true, message: "Email is required" },
          })}
          className="p-3 rounded block mb-2 bg-slate-900 text-slate-300 w-full"
          placeholder="user@email.com"
        />
        {errors.email && (
          <span className="text-red-500 text-xs">{errors.email.message}</span>
        )}

        <label htmlFor="password" className="text-slate-500 mb-2 block text-sm">
          Password:
        </label>
        <input
          id="password"
          type="password"
          {...register("password", {
            required: { value: true, message: "Password is required" },
          })}
          className="p-3 rounded block mb-2 bg-slate-900 text-slate-300 w-full"
          placeholder="******"
        />
        {errors.password && (
          <span className="text-red-500 text-xs">{errors.password.message}</span>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-3 rounded-lg mt-2 disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
