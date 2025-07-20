// src/components/Auth.js
import React, { useState } from 'react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Lógica de login aqui
  };

  const handleSignup = (e) => {
    e.preventDefault();
    // Lógica de cadastro aqui
  };

  return (
    <div>
      <h2>Login ou Cadastro</h2>
      <form>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" onClick={handleLogin}>Entrar</button>
        <button type="submit" onClick={handleSignup}>Cadastrar</button>
      </form>
    </div>
  );
};

export default Auth;
