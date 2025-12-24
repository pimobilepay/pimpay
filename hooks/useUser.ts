"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name?: string;
  firstName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  dob?: string;
  avatar?: string;
  kycStatus: string;
}

export default function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("pimpay_token");
        if (!token) return;

        // Appel à ton API de profil utilisateur
        const res = await fetch("/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
      }
    };

    fetchUser();
  }, []);

  return user;
}
