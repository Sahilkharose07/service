import { useState } from 'react';

let isLoggedIn = false;

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);

  function login() {
    isLoggedIn = true;
    setLoggedIn(true);
  }

  function logout() {
    isLoggedIn = false;
    setLoggedIn(false);
  }

  return { isLoggedIn: loggedIn, login, logout };
}
