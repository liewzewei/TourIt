import { useUserContext } from "@/context/user-context";

export default function useUser() {
  const { user, profile } = useUserContext();

  return {
    user,
    profile,
    loading: false,
  };
}