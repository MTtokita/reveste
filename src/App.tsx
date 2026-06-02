import { useState, useEffect } from 'react';
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { auth, db } from './firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Inicial from './inicial'; // Importação necessária para a troca de tela

type ScreenState = 'welcome' | 'signup' | 'signin' | 'dashboard';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('signup'); 
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para exibir mensagens de erro ou sucesso
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Escuta o tamanho da tela para comportamento responsivo
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Estados dos formulários
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agree: false
  });

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // Limpa as mensagens ao trocar de tela manualmente
  const mudarTela = (novaTela: ScreenState) => {
    setErrorMsg('');
    setSuccessMsg('');
    setScreen(novaTela);
  };

  // ================= CADASTRO REAL NO FIREBASE + TRANSIÇÃO =================
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!signUpData.fullName || !signUpData.email || !signUpData.phone || !signUpData.password) {
      setErrorMsg('Por favor, preencha todos os campos!');
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      setErrorMsg('As senhas não coincidem!');
      return;
    }

    if (!signUpData.agree) {
      setErrorMsg('Você precisa aceitar os termos e condições!');
      return;
    }

    mudarTela('signin'); 
    setSuccessMsg('Cadastro realizado! Faça seu login para entrar.');

    createUserWithEmailAndPassword(auth, signUpData.email, signUpData.password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        await setDoc(doc(db, "usuarios", user.uid), {
          uid: user.uid,
          nome: signUpData.fullName,
          email: signUpData.email,
          telefone: signUpData.phone,
          criadoEm: new Date().toISOString()
        });
        
        setSignUpData({
          fullName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          agree: false
        });
      })
      .catch((error) => {
        console.warn("Erro ao registrar no banco de dados:", error.message);
      });
  };

  // ================= LOGIN REAL NO FIREBASE =================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signInData.email || !signInData.password) {
      setErrorMsg('Preencha o e-mail e a senha!');
      return;
    }

    loading || setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, signInData.email, signInData.password);
      setSuccessMsg('Login realizado com sucesso! Entrando...');
      
      setTimeout(() => {
        setScreen('dashboard'); 
      }, 1500);
  
    } catch (error: any) {
      console.error(error);
      setErrorMsg('E-mail ou senha incorretos!');
    } finally {
      setLoading(false);
    }
  };

  // Função para realizar o logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      mudarTela('signin');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  // LÓGICA SIMPLIFICADA: Se for dashboard, mostra Inicial. Se não, mostra o layout de Auth.
  if (screen === 'dashboard') {
   return (
    <Inicial 
      userName={auth.currentUser?.displayName || signUpData.fullName || "Usuário"} 
      userEmail={auth.currentUser?.email || signInData.email} 
      userPhone={signUpData.phone || ""} 
      onLogout={handleLogout} 
    />
  );
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={{
        ...styles.mainContainer,
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        
        {/* ================= COLUNA DA IMAGEM ================= */}
        {(!isMobile || screen === 'welcome') && (
          <div style={{ 
            ...styles.imageColumn, 
            width: isMobile ? '100%' : '50%',
            height: isMobile ? '100vh' : '100%',
            backgroundImage: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('https://images.tcdn.com.br/img/img_prod/1231219/tecido_oxford_1_50m_largura_azul_royal_1347_1_51acc67fdcb516b467b4f8283ff00c25.jpeg')" 
          }}>
            <div style={styles.welcomeTop}>
              <span style={styles.logoText}>reveste</span>
            </div>
            
            <div style={styles.welcomeMiddle}>
              <h1 style={styles.welcomeTitle}>Comece uma<br />nova experiência.</h1>
              <div style={styles.bullets}>
                <span style={{ ...styles.bullet, ...styles.bulletActive }}></span>
                <span style={styles.bullet}></span>
                <span style={styles.bullet}></span>
              </div>
            </div>

            {isMobile && screen === 'welcome' && (
              <div style={styles.welcomeBottomCardMobile}>
                <p style={styles.welcomeDescMobile}>Conecte-se com as melhores soluções e ideias de revestimento ao seu redor.</p>
                <button style={styles.btnDark} onClick={() => mudarTela('signin')}>
                  Entrar
                </button>
                <button style={styles.linkRowDark} onClick={() => mudarTela('signup')}>
                  Ou Criar Conta <FiArrowRight style={{ marginLeft: 8 }} />
                </button>
              </div>
            )}

            {!isMobile && (
              <div style={styles.desktopWelcomeText}>
                <p>Junte-se a milhares de pessoas descobrindo revestimentos, calculando orçamentos e transformando ambientes todos os dias.</p>
              </div>
            )}
          </div>
        )}

        {/* ================= COLUNA DO FORMULÁRIO ================= */}
        {(!isMobile || screen !== 'welcome') && (
          <div style={{ 
            ...styles.formColumn, 
            width: isMobile ? '100%' : '50%' 
          }}>
            
            {isMobile && (
              <button style={styles.mobileBackBtn} onClick={() => mudarTela('welcome')}>
                <FiArrowLeft size={24} /> Voltar para o início
              </button>
            )}

            {/* TELA DE SIGN UP (CADASTRO) */}
            {screen === 'signup' && (
              <div style={styles.formInnerContainer}>
                <div style={styles.formHeaderDesktop}>
                  <h2 style={styles.formTitle}>Criar Conta.</h2>
                  <p style={styles.formSubtitle}>Insira seus dados abaixo para começar.</p>
                </div>

                <form onSubmit={handleSignUp} style={styles.formBody}>
                  <div style={styles.inputGroup}>
                    <input 
                      type="text" 
                      placeholder="Nome Completo" 
                      style={styles.input}
                      value={signUpData.fullName}
                      onChange={e => setSignUpData({...signUpData, fullName: e.target.value})}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <input 
                      type="email" 
                      placeholder="E-mail" 
                      style={styles.input}
                      value={signUpData.email}
                      onChange={e => setSignUpData({...signUpData, email: e.target.value})}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <input 
                      type="tel" 
                      placeholder="Telefone" 
                      style={styles.input}
                      value={signUpData.phone}
                      onChange={e => setSignUpData({...signUpData, phone: e.target.value})}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <input 
                      type="password" 
                      placeholder="Senha" 
                      style={styles.input}
                      value={signUpData.password}
                      onChange={e => setSignUpData({...signUpData, password: e.target.value})}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <input 
                      type="password" 
                      placeholder="Confirmar Senha" 
                      style={styles.input}
                      value={signUpData.confirmPassword}
                      onChange={e => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                    />
                  </div>

                  <label style={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      style={styles.checkbox}
                      checked={signUpData.agree}
                      onChange={e => setSignUpData({...signUpData, agree: e.target.checked})}
                    />
                    Concordo com os termos e condições
                  </label>

                  {errorMsg && <div style={styles.errorMessage}>{errorMsg}</div>}

                  <button type="submit" disabled={loading} style={styles.btnLight}>
                    {loading ? 'PRONTO! faça login' : 'Cadastrar'}
                  </button>

                  <p style={styles.switchText}>
                    Já tem uma conta?{' '}
                    <span style={styles.switchLink} onClick={() => mudarTela('signin')}>Entrar</span>
                  </p>
                </form>
              </div>
            )}

            {/* TELA DE SIGN IN (LOGIN) */}
            {screen === 'signin' && (
              <div style={styles.formInnerContainer}>
                <div style={styles.formHeaderDesktop}>
                  <h2 style={styles.formTitle}>Boas-vindas de volta!</h2>
                  <p style={styles.formSubtitle}>Continue a sua jornada.</p>
                </div>

                <form onSubmit={handleSignIn} style={styles.formBody}>
                  <div style={styles.inputGroup}>
                    <input 
                      type="email" 
                      placeholder="E-mail" 
                      style={styles.input}
                      value={signInData.email}
                      onChange={e => setSignInData({...signInData, email: e.target.value})}
                    />
                  </div>
                  
                  <div style={styles.passwordContainer}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Senha" 
                      style={styles.inputPassword}
                      value={signInData.password}
                      onChange={e => setSignInData({...signInData, password: e.target.value})}
                    />
                    <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>

                  <div style={styles.rowBetween}>
                    <label style={styles.checkboxLabel}>
                      <input 
                        type="checkbox" 
                        style={styles.checkbox}
                        checked={signInData.rememberMe}
                        onChange={e => setSignInData({...signInData, rememberMe: e.target.checked})}
                      />
                      Lembrar de mim
                    </label>
                    <p style={styles.forgotPassword} onClick={() => setErrorMsg('Recuperação de senha não configurada.')}>
                      Esqueceu a senha?
                    </p>
                  </div>

                  {errorMsg && <div style={styles.errorMessage}>{errorMsg}</div>}
                  {successMsg && <div style={styles.successMessage}>{successMsg}</div>}

                  <button type="submit" disabled={loading} style={styles.btnLight}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>

                  <p style={styles.switchText}>
                    Novo por aqui?{' '}
                    <span style={styles.switchLink} onClick={() => mudarTela('signup')}>Criar Conta</span>
                  </p>
                </form>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// Estilos
const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12161a',
    overflow: 'hidden',
  },
  mainContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
    maxWidth: '1440px',
    backgroundColor: '#252d32',
    transition: 'all 0.3s ease',
  },
  imageColumn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '40px',
    position: 'relative',
    boxSizing: 'border-box'
  },
  welcomeTop: {
    alignSelf: 'flex-start',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: '1px',
  },
  welcomeMiddle: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingBottom: '40px',
  },
  welcomeTitle: {
    fontSize: '48px',
    fontWeight: '700',
    lineHeight: '1.15',
    color: '#fff',
    marginBottom: '24px',
  },
  bullets: {
    display: 'flex',
    gap: '8px',
  },
  bullet: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  bulletActive: {
    backgroundColor: '#fff',
    width: '24px',
    borderRadius: '10px',
  },
  desktopWelcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '16px',
    lineHeight: '1.6',
    maxWidth: '450px',
    fontWeight: '400',
  },
  welcomeBottomCardMobile: {
    backgroundColor: '#eae6e2',
    padding: '30px',
    borderRadius: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '20px',
  },
  welcomeDescMobile: {
    color: '#12161a',
    fontSize: '15px',
    lineHeight: '1.5',
    fontWeight: '500',
  },
  formColumn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#252d32',
    padding: '40px 20px',
    overflowY: 'auto',
    height: '100%',
    boxSizing: 'border-box'
  },
  formInnerContainer: {
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  formHeaderDesktop: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  formTitle: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#eae6e2',
    letterSpacing: '-0.5px',
  },
  formSubtitle: {
    fontSize: '15px',
    color: '#a0aec0',
  },
  formBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    width: '100%',
  },
  input: {
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: '1.5px solid #4a555c',
    padding: '12px 0',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s',
    borderRadius: '8px',
  },
  passwordContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  inputPassword: {
    width: '100%',
    background: 'none',
    border: 'none',
    borderRadius: '8px',
    borderBottom: '1.5px solid #4a555c',
    padding: '12px 30px 12px 0',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    bottom: '12px',
    background: 'none',
    border: 'none',
    color: '#8a99a4',
    cursor: 'pointer',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#a0aec0',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '5px',
  },
  checkbox: {
    accentColor: '#eae6e2',
    width: '16px',
    height: '16px',
  },
  btnDark: {
    backgroundColor: '#12161a',
    color: '#fff',
    border: 'none',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  btnLight: {
    backgroundColor: '#eae6e2',
    color: '#12161a',
    border: 'none',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '15px',
    transition: 'opacity 0.2s',
  },
  linkRowDark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: '#12161a',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  switchText: {
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: '14px',
    marginTop: '15px',
  },
  switchLink: {
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  forgotPassword: {
    color: '#a0aec0',
    fontSize: '13px',
    cursor: 'pointer',
  },
  rowBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '5px',
  },
  mobileBackBtn: {
    alignSelf: 'flex-start',
    background: 'none',
    border: 'none',
    color: '#eae6e2',
    fontSize: '15px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    cursor: 'pointer',
  },
  errorMessage: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '10px',
  },
  successMessage: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '10px',
  }
};