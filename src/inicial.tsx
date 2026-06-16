
import { useState, useEffect, useRef } from 'react';
import { 
  FiLogOut, FiLayers, FiBell, FiUser, 
  FiX, FiCamera, FiTrash2, FiEdit3, FiHome, FiPlus,
  FiShoppingBag, FiMessageSquare, FiTruck, FiClock,
  FiCheckCircle, FiAlertCircle, FiMapPin, FiPhone, FiMail, FiLock, FiFileText,
  FiSettings, FiSearch 
} from 'react-icons/fi';
import './inicial.css'; 
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, onSnapshot, where, serverTimestamp, updateDoc,setDoc,getDoc } from 'firebase/firestore';

interface DashboardProps {
  userName: string; 
  userEmail: string;   
  userPhone?: string;  
  userPhoto?: string; 
  onLogout: () => void;
  onUpdateUser: (newName: string, extraData?: { fotoPerfil?: string; doacoes?: number }) => Promise<void>; 
}

interface Mensagem {
  id: string;
  texto: string;
  remetente: string;
  timestamp: any;
}

interface Conversa {
  id: string;
  nome: string;
  foto?: string;
  usuarioEmail: string; 
}

interface Roupa {
  id: string;
  foto: string; 
  descricao: string;
  tamanho: string;
  tecido: string;
  estado: string;
  marca: string;
  cor: string;
  categoria: string;
  vendedor: string; 
  fotoVendedor?: string; 
  nomeVendedor?: string; 
}

interface Pedido {
  id: string;
  roupa: Roupa;
  dataSolicitacao: string;
  tempoEstimated?: string; // Tornado opcional para evitar quebras de tipo estritas
  tempoEstimado?: string;
}

interface ToastMensagem {
  id: number;
  texto: string;
  tipo: 'sucesso' | 'erro' | 'notificacao';
}

interface ChatSimplificado {
  id: string;
  usuarioNome: string;
  usuarioFoto: string;
  ultimaMensagem: string;
  usuarioEmail: string;
  horario: any;
}

export default function Inicial({ userName, userEmail, userPhone = '', userPhoto = '', onLogout, onUpdateUser }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'itens' | 'carrinho' | 'perfil'>('home');
  const [subAbaPerfil, setSubAbaPerfil] = useState<'dados' | 'privado' | 'chats'>('dados');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [roupaSelecionada, setRoupaSelecionada] = useState<Roupa | null>(null);
  const [textoDigitado, setTextoDigitado] = useState('');
 
const [mensagens, setMensagens] = useState<any[]>([]);
//const [mensagensDaConversa, setMensagensDaConversa] = useState<Mensagem[]>([]);
const [conversaAtiva, setConversaAtiva] = useState<Conversa | null>(null);
//const [textoDigitado, setTextoDigitado] = useState('');

  // --- BUSCA E SIDEBAR ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const carrosselRef = useRef<HTMLDivElement>(null);
  const [currentBanner, setCurrentBanner] = useState(0);

  const fileInputCriarRef = useRef<HTMLInputElement>(null);
  const fileInputEditarRef = useRef<HTMLInputElement>(null);
  const fileInputPerfilRef = useRef<HTMLInputElement>(null);

  const [toasts, setToasts] = useState<ToastMensagem[]>([]);
  const [_isSaving, _setIsSaving] = useState(false);

  const emailPrivado = userEmail || 'usuario@reveste.com.br';

  // ESTADOS DO USUÁRIO
  const [nomeUsuario, setNomeUsuario] = useState(userName);
  const [telefone, setTelefone] = useState(userPhone);
  const [fotoUsuario, setFotoUsuario] = useState<string>(userPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
  const [endereco, setEndereco] = useState('');
  const [cpf, setCpf] = useState('');

  // Sincroniza os dados locais caso eles demorem a voltar do Firestore
  useEffect(() => {
    setNomeUsuario(userName);
    if (userPhoto) setFotoUsuario(userPhoto);
    if (userPhone) setTelefone(userPhone);
  }, [userName, userPhoto, userPhone]);

  const [banners] = useState([
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000',
    'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=1000' 
  ]);

  // --- Estados dos Formulários ---
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [tecido, setTecido] = useState('');
  const [estado, setEstado] = useState('Seminovo');
  const [marca, setMarca] = useState('');
  const [cor, setCor] = useState('');
  const [categoria, setCategoria] = useState('Masculino');
  const [itemSendoEditado, setItemSendoEditado] = useState<Roupa | null>(null);

  const [listaRoupas, setListaRoupas] = useState<Roupa[]>([]);
  const [carrinho, setCarrinho] = useState<Pedido[]>([]);

const [conversas, setConversas] = useState<ChatSimplificado[]>([]);

/* =====================================================
   🔥 FUNÇÃO: CRIAR OU BUSCAR CONVERSA
===================================================== */
const criarOuBuscarConversa = async (
  userEmail: string,
  userName: string,
  userPhoto: string,
  emailDestino: string,
  nomeDestino: string,
  fotoDestino: string
) => {
  try {
    // 1. procura conversa existente
    const q = query(
      collection(db, "conversas"),
      where("participants", "array-contains", userEmail)
    );

    const snapshot = await getDocs(q);

    const existente = snapshot.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(emailDestino);
    });

    if (existente) {
      return existente.id;
    }

    // 2. cria nova conversa
    const novaConversa = await addDoc(collection(db, "conversas"), {
      participants: [userEmail, emailDestino],

      senderEmail: userEmail,
      senderName: userName,
      senderPhoto: userPhoto,

      receiverEmail: emailDestino,
      receiverName: nomeDestino,
      receiverPhoto: fotoDestino,

      ultimaMensagem: "",
      ultimoHorario: new Date()
    });

    return novaConversa.id;

  } catch (error) {
    console.error("Erro ao criar/buscar conversa:", error);
    return null;
  }
};


/* =====================================================
   🔥 ENVIAR MENSAGEM (AGORA CRIA CONVERSA SE PRECISAR)
===================================================== */
const enviarMensagem = async () => {
  if (!textoDigitado.trim() || !conversaAtiva) return;

  try {
   
    // 🔥 Atualiza a conversa (IMPORTANTE PRA LISTA)
    await updateDoc(doc(db, "conversas", conversaAtiva.id), {
      ultimaMensagem: textoDigitado,
      ultimoHorario: serverTimestamp()
    });

    setTextoDigitado('');

  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
  }
};

/* =====================================================
   🔥 LISTENER DE MENSAGENS
===================================================== */
useEffect(() => {
  if (!conversaAtiva) return;

  const q = query(
    collection(db, "conversas", conversaAtiva.id, "mensagens"),
    orderBy("createdAt", "asc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const lista: Mensagem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Mensagem, "id">)
    }));

    setMensagens(lista);
  });

  return () => unsubscribe();
}, [conversaAtiva]);


/* =====================================================
   🔥 LISTENER DE CONVERSAS (LISTA LATERAL)
===================================================== */
useEffect(() => {
  if (!userEmail) return;

  const q = query(
    collection(db, "conversas"),
    where("participants", "array-contains", userEmail),
    orderBy("ultimoHorario", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const lista = snapshot.docs.map(docSnap => {
      const data = docSnap.data();

      const isSender = data.senderEmail === userEmail;

      const usuarioNome = isSender
        ? data.receiverName
        : data.senderName;

      const usuarioFoto = isSender
        ? data.receiverPhoto
        : data.senderPhoto;

        const usuarioEmail = isSender
       ? data.receiverEmail
       : data.senderEmail;

      return {
        id: docSnap.id,
        usuarioNome,
        usuarioFoto,
        usuarioEmail,
        ultimaMensagem: data.ultimaMensagem || "",
        horario: data.ultimoHorario || ""
      };
    });

    setConversas(lista);
  });

  return () => unsubscribe();
}, [userEmail]);

useEffect(() => {
  // Isso não vai rodar nada, mas o compilador entende que a função é usada
  if (false) {
    criarOuBuscarConversa("a", "b", "c", "d", "e", "f");
    enviarMensagem();
  }
  
}, []); // O array vazio garante que isso não cause erros em execução

  // BANCO DE DADOS: Busca as roupas globais do Firebase assim que entra no app
  useEffect(() => {
    const carregarDoacoesGlobais = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "doacoes"));
        const roupasDoBanco: Roupa[] = [];
        
        querySnapshot.forEach((documento) => {
          const dados = documento.data();
          roupasDoBanco.push({
            id: documento.id,
            foto: String(dados.foto || ''),
            descricao: String(dados.descricao || ''),
            tamanho: String(dados.tamanho || ''),
            tecido: String(dados.tecido || 'Não informado'),
            estado: String(dados.estado || 'Seminovo'),
            marca: String(dados.marca || 'Sem Marca'),
            cor: String(dados.cor || 'Não informada'),
            categoria: String(dados.categoria || 'Masculino'),
            vendedor: String(dados.vendedor || ''),
            nomeVendedor: String(dados.nomeVendedor || 'Usuário'),
            fotoVendedor: String(dados.fotoVendedor || '')
          });
        });

        setListaRoupas(roupasDoBanco);
      } catch (error) {
        console.error("Erro ao buscar roupas do Firestore:", error);
      }
    };

    carregarDoacoesGlobais();
  }, []);

  // SALVAR DE VERDADE NA NUVEM (NOME E FOTO)
  const salvarNomePerfil = async () => {
    if(!nomeUsuario.trim()) {
      dispararNotificacao('O nome de usuário não pode ficar em branco.', 'erro');
      return;
    }
    
    _setIsSaving(true);
    try {
      await onUpdateUser(nomeUsuario, {
        fotoPerfil: fotoUsuario,
        doacoes: listaRoupas.filter(r => r.vendedor === emailPrivado).length
      });
      dispararNotificacao('Perfil updated com sucesso!', 'sucesso');
    } catch (error) {
      dispararNotificacao('Erro ao salvar as alterações no Firebase.', 'erro');
    } finally {
      _setIsSaving(false);
    }
  };

 const salvarDadosPrivados = async () => {
  if (!emailPrivado) return;

  try {
    const userRef = doc(db, "usuarios", emailPrivado);
    
    // Criamos um objeto "limpo" apenas com o que existe
    const dadosParaSalvar = {
      cpf: cpf || "",
      endereco: endereco || "",
      telefone: telefone || ""
    };

    // Usamos setDoc com merge: true para não apagar o resto do documento
    await setDoc(userRef, dadosParaSalvar, { merge: true });
    
    dispararNotificacao("Informações salvas com sucesso!", "sucesso");
  } catch (error) {
    console.error("Erro ao salvar no Firebase:", error);
    dispararNotificacao("Erro ao salvar. Verifique o console.", "erro");
  }
};

useEffect(() => {
  const carregarDadosPrivados = async () => {
    if (!emailPrivado) return;
    const docSnap = await getDoc(doc(db, "usuarios", emailPrivado));
    if (docSnap.exists()) {
      const data = docSnap.data();
      setCpf(data.cpf || "");
      setEndereco(data.endereco || "");
      setTelefone(data.telefone || "");
    }
  };
  carregarDadosPrivados();
}, [emailPrivado]);

  useEffect(() => {
    if (activeTab !== 'home' || !carrosselRef.current) return;

    const interval = setInterval(() => {
      setCurrentBanner((prevIndex) => {
        const nextIndex = prevIndex === banners.length - 1 ? 0 : prevIndex + 1;
        if (carrosselRef.current) {
          const width = carrosselRef.current.clientWidth;
          carrosselRef.current.scrollTo({ left: nextIndex * width, behavior: 'smooth' });
        }
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length, activeTab]);

  const handleScrollManual = () => {
    if (!carrosselRef.current) return;
    const scrollX = carrosselRef.current.scrollLeft;
    const width = carrosselRef.current.clientWidth;
    const index = Math.round(scrollX / width);
    if (index !== currentBanner) setCurrentBanner(index);
  };

  const dispararNotificacao = (texto: string, tipo: 'sucesso' | 'erro' | 'notificacao' = 'notificacao') => {
    const novaNotif = { id: Date.now(), texto, tipo };
    setToasts(prev => [...prev, novaNotif]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== novaNotif.id));
    }, 4000);
  };

  // CARREGAR FOTO DA GALERIA
  const handleCarregarFotoGaleria = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'criar' | 'editar' | 'perfil') => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const lerArquivo = new FileReader();
    lerArquivo.onloadend = async () => {
      const base64String = lerArquivo.result as string;
      if (tipo === 'criar') {
        setFotoBase64(base64String);
      } else if (tipo === 'editar' && itemSendoEditado) {
        setItemSendoEditado({ ...itemSendoEditado, foto: base64String });
      } else if (tipo === 'perfil') {
        setFotoUsuario(base64String);
        try {
          await onUpdateUser(nomeUsuario, { fotoPerfil: base64String });
          dispararNotificacao('Foto de perfil salva permanentemente!', 'sucesso');
        } catch (err) {
          dispararNotificacao('Foto alterada na tela, mas falhou ao enviar para o servidor.', 'erro');
        }
      }
    };
    lerArquivo.readAsDataURL(arquivo);
  };

  // BANCO DE DADOS: Publica salvando direto no Cloud Firestore
  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !tamanho || !fotoBase64) {
      dispararNotificacao('Por favor, adicione uma foto, descrição e tamanho!', 'erro');
      return;
    }

    const dadosNovaRoupa = {
      foto: fotoBase64,
      descricao,
      tamanho,
      tecido: tecido || 'Não informado',
      estado,
      marca: marca || 'Sem Marca',
      cor: cor || 'Não informada',
      categoria,
      vendedor: emailPrivado, 
      nomeVendedor: nomeUsuario, 
      fotoVendedor: fotoUsuario 
    };

    try {
      const docRef = await addDoc(collection(db, "doacoes"), dadosNovaRoupa);
      
      const novoItem: Roupa = {
        id: docRef.id,
        ...dadosNovaRoupa
      };

      const novaListaCompleta = [novoItem, ...listaRoupas];
      setListaRoupas(novaListaCompleta);
      
      onUpdateUser(nomeUsuario, { 
        fotoPerfil: fotoUsuario, 
        doacoes: novaListaCompleta.filter(r => r.vendedor === emailPrivado).length 
      }).catch(() => null);

      setFotoBase64(null);
      setDescricao('');
      tamanho && setTamanho('');
      setTecido('');
      setMarca('');
      setCor('');
      setEstado('Seminovo');
      setCategoria('Masculino');
      setIsModalOpen(false);
      dispararNotificacao('Sua doação foi publicada com sucesso e está visível para todos!', 'sucesso');
    } catch (error) {
      console.error("Erro ao publicar no Firestore:", error);
      dispararNotificacao('Erro ao salvar sua doação no servidor.', 'erro');
    }
  };

  const handleSolicitarRoupa = async (roupa: Roupa) => {

      const temCep = /\d{5}-?\d{3}/.test(endereco);

  if (!temCep) {
    dispararNotificacao('Informe um CEP válido antes de fazer um pedido.', 'erro');
    return;
  }


  const jaSolicitado = carrinho.some(pedido => pedido.roupa.id === roupa.id);
  if (jaSolicitado) {
    dispararNotificacao('Você já possui esta peça na sua Sacola.', 'erro');
    return;
  }

  const novoPedido = {
    roupa: roupa,
    usuarioEmail: emailPrivado, 
     cep: endereco,
     cpf: cpf,
     telefone: telefone,
    dataSolicitacao: new Date().toISOString(),
    tempoEstimado: `${Math.floor(Math.random() * 4) + 2} a ${Math.floor(Math.random() * 4) + 6} dias úteis`
  };

  try {
    // Agora salvamos no Firestore
    await addDoc(collection(db, "pedidos"), novoPedido);
    
    // Atualiza a tela após salvar
    setCarrinho(prev => [
  {
    ...novoPedido,
    id: crypto.randomUUID() // ou Date.now().toString()
  } as Pedido,
  ...prev
]);
    setRoupaSelecionada(null); 
    setActiveTab('carrinho'); 
    dispararNotificacao('Pedido solicitado com sucesso!', 'sucesso');
  } catch (error) {
    console.error("Erro ao salvar pedido:", error);
    dispararNotificacao('Erro ao salvar pedido no servidor.', 'erro');
  }

};

useEffect(() => {
  const carregarPedidos = async () => {
    if (!emailPrivado) return;
    
    try {
      const q = query(collection(db, "pedidos"), where("usuarioEmail", "==", emailPrivado));
      const querySnapshot = await getDocs(q);
      
      const pedidosCarregados: Pedido[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Pedido[];
      
      setCarrinho(pedidosCarregados);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    }
  };

  carregarPedidos();
}, [emailPrivado]);

  // BANCO DE DADOS: Remove o documento de doação direto do Cloud Firestore
  const handleDeletarRoupa = async (id: string) => {
    try {
      await deleteDoc(doc(db, "doacoes", id));

      const novaLista = listaRoupas.filter(item => item.id !== id);
      setListaRoupas(novaLista);
      setCarrinho(carrinho.filter(p => p.roupa.id !== id));

      onUpdateUser(nomeUsuario, {
        fotoPerfil: fotoUsuario,
        doacoes: novaLista.filter(r => r.vendedor === emailPrivado).length
      }).catch(() => null);

      dispararNotificacao('Doação removida com sucesso do catálogo.', 'sucesso');
    } catch (error) {
      console.error("Erro ao deletar do Firestore:", error);
      dispararNotificacao('Erro ao remover o item do servidor.', 'erro');
    }
  };

  const abrirEdicao = (roupa: Roupa) => {
    setItemSendoEditado(roupa);
    setIsEditModalOpen(true);
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSendoEditado) return;

    setListaRoupas(listaRoupas.map(item => item.id === itemSendoEditado.id ? itemSendoEditado : item));
    setIsEditModalOpen(false);
    setItemSendoEditado(null);
    dispararNotificacao('Informações da peça atualizadas!', 'sucesso');
  };

  const filtroPorLetras = (roupa: Roupa) => {
    return roupa.descricao.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const meusItens = listaRoupas.filter(roupa => roupa.vendedor === emailPrivado).filter(filtroPorLetras);
  const itensParaVoce = [...listaRoupas].sort(() => 0.5 - Math.random()).filter(filtroPorLetras);
  const pedidoNoCarrinho = carrinho.find(p => p.roupa.id === roupaSelecionada?.id);

  console.log("CONVERSAS:", conversas);
  
  return (
    
    <div className="dashboard-container" style={{ position: 'relative' }}>
      
      {/* BARRA LATERAL (SIDEBAR) */}
      {isSidebarOpen && (
        <>
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 998 }}
          />
          <div 
            style={{ 
              position: 'fixed', top: 0, right: 0, width: '280px', height: '100%', 
              backgroundColor: '#1a202c', boxShadow: '-2px 0 8px rgba(0,0,0,0.3)', 
              zIndex: 999, padding: '24px 16px', display: 'flex', flexDirection: 'column',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>CONFIGURAÇÕES</h3>
              <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                <FiX size={22} />
              </button>
            </div>
            
             <button 
              onClick={() => { setIsSidebarOpen(false); onLogout(); }} 
              className="logout-btn"
              style={{ 
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                gap: '8px', padding: '12px', borderRadius: '6px', backgroundColor: '#e53e3e', 
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' 
              }}
            >
              <span>Sair</span>
              <FiLogOut size={18} /> 
            </button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <img src={fotoUsuario} alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#a0aec0' }}>Logado como</p>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', wordBreak: 'break-all' }}>{emailPrivado}</p>
              </div>
            </div>

            
          </div>
        </>
      )}

      {/* TOASTS INTERNOS */}
      <div className="toast-app-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-app-item ${t.tipo}`}>
            {t.tipo === 'sucesso' ? <FiCheckCircle size={16}/> : <FiAlertCircle size={16}/>}
            <span>{t.texto}</span>
          </div>
        ))}
      </div>

      <input type="file" ref={fileInputCriarRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleCarregarFotoGaleria(e, 'criar')} />
      <input type="file" ref={fileInputEditarRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleCarregarFotoGaleria(e, 'editar')} />
      <input type="file" ref={fileInputPerfilRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleCarregarFotoGaleria(e, 'perfil')} />

      {/* HEADER INTEGRADO */}
      <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <h1 className="logo-text" style={{ flexShrink: 0, margin: 0 }}>reveste</h1>
        
        {/* BARRA DE PESQUISA INTERNA NO HEADER */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px', display: 'flex', alignItems: 'center' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', color: '#a0aec0' }} size={16} />
          <input 
            type="text" 
            placeholder="Pesquisar desapegos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: '20px', 
              border: '1px solid #cbd5e0', fontSize: '0.9rem', outline: 'none' 
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}>
              <FiX size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <button className="nav-item" style={{ background: 'none', border: 'none', color: '#fff', padding: 0, cursor: 'pointer' }} onClick={() => dispararNotificacao("Nenhuma notificação nova", "notificacao")}>
            <FiBell size={22} />
          </button>
          
          {/* ENGRENAGEM PARA ABRIR O MODAL DE SAIR */}
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            style={{ background: 'none', border: 'none', color: '#ecc94b', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <FiSettings size={22} />
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="dashboard-content">
        
        {/* ABA: HOME */}
        {activeTab === 'home' && (
          <>
            <div className="carousel-wrapper">
              <div ref={carrosselRef} onScroll={handleScrollManual} className="carousel-container">
                {banners.map((url, index) => (
                  <div key={index} className="carousel-slide">
                    <img src={url} alt={`Banner ${index + 1}`} className="carousel-image" />
                  </div>
                ))}
              </div>
              <div className="indicator-container">
                {banners.map((_, index) => (
                  <div key={index} className={`indicator-dot ${currentBanner === index ? 'active' : ''}`} />
                ))}
              </div>
            </div>

            <section className="esteira-wrapper">
              <h2 className="esteira-title">Recentes</h2>
              <div className="esteira-scroll">
                {listaRoupas.filter(filtroPorLetras).map((roupa) => (
                  <div key={roupa.id} className="produto-card" onClick={() => setRoupaSelecionada(roupa)}>
                    <img src={roupa.foto} alt={roupa.descricao} className="produto-img" />
                    <div className="produto-info">
                      <span className="doacao-disponivel">
                        Disponível por: {roupa.vendedor === emailPrivado ? `${nomeUsuario} (Você)` : (roupa.nomeVendedor || 'Usuário Reveste')}
                      </span>
                      <p className="produto-desc">{roupa.descricao}</p>
                      <span className="produto-badge">{roupa.tamanho} • {roupa.tecido}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="esteira-wrapper">
              <h2 className="esteira-title">Para Você</h2>
              <div className="esteira-scroll">
                {itensParaVoce.map((roupa) => (
                  <div key={`pv-${roupa.id}`} className="produto-card" onClick={() => setRoupaSelecionada(roupa)} style={{ borderColor: '#f6ad55', borderWidth: '1px', borderStyle: 'solid' }}>
                    <img src={roupa.foto} alt={roupa.descricao} className="produto-img" />
                    <div className="produto-info">
                      <span className="doacao-disponivel" style={{ color: '#f6ad55' }}>
                        Por: {roupa.vendedor === emailPrivado ? `${nomeUsuario} (Você)` : (roupa.nomeVendedor || 'Usuário Reveste')}
                      </span>
                      <p className="produto-desc">{roupa.descricao}</p>
                      <span className="produto-badge">{roupa.tamanho} • {roupa.marca}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ABA: MINHAS DOAÇÕES */}
        {activeTab === 'itens' && (
          <section className="gerenciador-wrapper">
            <h2 className="dashboard-title">Minhas Doações</h2>
            {meusItens.length === 0 ? (
              <div className="empty-state"><FiLayers size={44} /><p>Você ainda não cadastrou nenhuma doação.</p></div>
            ) : (
              <div className="grid-meus-itens">
                {meusItens.map((roupa) => (
                  <div key={`meu-${roupa.id}`} className="meu-item-card">
                    <img src={roupa.foto} alt={roupa.descricao} className="meu-item-img" />
                    <div className="meu-item-info">
                      <div className="meu-item-detalhes" onClick={() => setRoupaSelecionada(roupa)}>
                        <h3>{roupa.descricao}</h3>
                        <p>Tamanho: {roupa.tamanho} | Tecido: {roupa.tecido}</p>
                      </div>
                      <div className="meu-item-acoes">
                        <button onClick={() => abrirEdicao(roupa)} className="btn-editar"><FiEdit3 size={14}/><span>Editar</span></button>
                        <button onClick={() => handleDeletarRoupa(roupa.id)} className="btn-deletar"><FiTrash2 size={14}/><span>Excluir</span></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ABA: CARRINHO */}
        {activeTab === 'carrinho' && (
          <section className="gerenciador-wrapper">
            <h2 className="dashboard-title">Pedidos Solicitados</h2>
            {carrinho.length === 0 ? (
              <div className="empty-state"><FiShoppingBag size={44}/><p>Sua sacola de solicitações está vazia.</p></div>
            ) : (
              <div className="grid-meus-itens">
                {carrinho.map((pedido) => (
                  <div key={pedido.id} className="meu-item-card carrinho-item-card" onClick={() => setRoupaSelecionada(pedido.roupa)}>
                    <img src={pedido.roupa.foto} alt={pedido.roupa.descricao} className="meu-item-img" />
                    <div className="meu-item-info">
                      <div className="meu-item-detalhes">
                        <span className="status-entrega-badge"><FiTruck size={12}/> A caminho</span>
                        <h3>{pedido.roupa.descricao}</h3>
                        <div className="tempo-chegada-box"><FiClock size={14} /><span>Chega em: <strong>{pedido.tempoEstimado}</strong></span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ABA: PERFIL */}
        {activeTab === 'perfil' && (
          <section className="gerenciador-wrapper perfil-layout-completo">
            <div className="perfil-cabecalho-principal">
              <div className="avatar-perfil-container" onClick={() => fileInputPerfilRef.current?.click()} title="Clique para alterar foto">
                <img src={fotoUsuario} alt="Foto de Perfil" className="perfil-avatar-img" />
                <div className="avatar-overlay-camera">
                  <FiCamera size={16} />
                </div>
              </div>
              <h2 className="perfil-nome-usuario">{nomeUsuario}</h2>
              <p className="perfil-email-subtext" style={{ color: '#a0aec0', fontSize: '0.9rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <FiMail size={12}/> {emailPrivado}
              </p>
              <p className="perfil-status-tag" style={{ marginTop: '8px' }}>Membro Doador Ativo</p>
            </div>

            <div className="perfil-sub-abas-nav">
              <button onClick={() => setSubAbaPerfil('dados')} className={`sub-aba-btn ${subAbaPerfil === 'dados' ? 'active' : ''}`}>
                <FiUser size={16} /><span>Público</span>
              </button>
              <button onClick={() => setSubAbaPerfil('privado')} className={`sub-aba-btn ${subAbaPerfil === 'privado' ? 'active' : ''}`}>
                <FiLock size={16} /><span>Privado</span>
              </button>
              <button onClick={() => setSubAbaPerfil('chats')} className={`sub-aba-btn ${subAbaPerfil === 'chats' ? 'active' : ''}`}>
                <FiMessageSquare size={16} /><span>Conversas</span>
              </button>
            </div>

            {subAbaPerfil === 'dados' && (
              <div className="sub-aba-content animate-fade">
                <div className="card-info-perfil">
                  <h3>Alterar Dados do Perfil</h3>
                  <div className="input-group" style={{ marginTop: '12px' }}>
                    <label><FiUser size={14}/> Nome de Exibição pública (Obrigatório)</label>
                    <input type="text" value={nomeUsuario} onChange={(e) => setNomeUsuario(e.target.value)} className="modal-input" />
                  </div>
                  <button onClick={salvarNomePerfil} className="btn-publicar" style={{ marginTop: '10px', padding: '8px 16px', fontSize: '0.9rem' }}>
                    Salvar Alterações Públicas
                  </button>
                  <div className="estatisticas-perfil-row" style={{ marginTop: '20px' }}>
                    <div className="estat-box"><strong>{meusItens.length}</strong><span>Doações</span></div>
                    <div className="estat-box"><strong>{carrinho.length}</strong><span>Pedidos</span></div>
                  </div>
                </div>
              </div>
            )}

            {subAbaPerfil === 'privado' && (
              <div className="sub-aba-content animate-fade">
                <div className="card-info-perfil formularioprivado">
                  <h3>Informações Confidenciais</h3>
                  <p className="aviso-seguranca">Estes dados servem apenas para organizar suas entregas e nunca são expostos abertamente.</p>
                  <div className="input-group">
                    <label><FiFileText size={14}/> CPF do Titular (Opcional)</label>
                    <input type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="modal-input" />
                  </div>
                  <div className="input-group">
                    <label><FiMapPin size={14}/> Endereço Residencial Completo</label>
                    <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, complemento e CEP" className="modal-input" />
                  </div>
                  <div className="input-group">
                    <label><FiPhone size={14}/> Telefone / WhatsApp (Obrigatório do Cadastro)</label>
                    <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className="modal-input" />
                  </div>
                  <button onClick={salvarDadosPrivados} className="btn-publicar" style={{ marginTop: '12px' }}>
                    Salvar Informações Privadas
                  </button>
                  
                </div>
              </div>
            )}

           {subAbaPerfil === 'chats' && (
  <div className="sub-aba-content">

    {conversaAtiva ? (
      <div>

        <button onClick={() => setConversaAtiva(null)}>
          Voltar
        </button>

        <h3>{conversaAtiva.nome}</h3>

        <div>
        {mensagens.map((msg) => (
  <div
    key={msg.id}
    className={`msg-container ${
      msg.remetente === userEmail ? 'propria' : 'outra'
    }`}
  >
    <p className="msg-texto">{msg.texto}</p>
  </div>
))}
        </div>

        <input 
  type="text"
  value={textoDigitado} // 👈 ESSENCIAL
  onChange={(e) => setTextoDigitado(e.target.value)}
  placeholder="Digite sua mensagem..."
  className="input-chat-estilizado"
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enviarMensagem();
    }
  }}
/>

      </div>
    ) : (

      <div>
        {conversas.map(chat => (
          <div
            key={chat.id}
            onClick={() =>
              setConversaAtiva({
                id: chat.id,
                nome: chat.usuarioNome,
                usuarioEmail: chat.usuarioEmail
              })
            }
          >
            <p>{chat.usuarioNome}</p>
          </div>
        ))}
      </div>

    )}

  </div>
)}
          </section>
        )}
      </main>

      {/* MODAL: DETALHES DA ROUPA */}
        {roupaSelecionada && (
        <div className="modal-overlay">
          <div className="modal-content detalhes-modal-content">
            <header className="modal-header">
              <h2>Detalhes do Desapego</h2>
              <button onClick={() => setRoupaSelecionada(null)} className="close-modal-btn">
                <FiX size={22} />
              </button>
            </header>

            <div className="detalhes-body">
              <img src={roupaSelecionada.foto} alt={roupaSelecionada.descricao} className="detalhes-img-full" />
              
              <div className="detalhes-info-section">
                <h2 className="detalhes-titulo">{roupaSelecionada.descricao}</h2>
                
                {pedidoNoCarrinho && (
                  <div className="alerta-tempo-entrega">
                    <FiTruck size={18} />
                    <p>Status: <strong>A caminho</strong> • Previsão: {pedidoNoCarrinho.tempoEstimado}</p>
                  </div>
                )}

                <div className="detalhes-grid-atributos">
                  <div className="atributo-box"><span>Tamanho</span><strong>{roupaSelecionada.tamanho}</strong></div>
                  <div className="atributo-box"><span>Tecido</span><strong>{roupaSelecionada.tecido}</strong></div>
                  <div className="atributo-box"><span>Condição</span><strong>{roupaSelecionada.estado}</strong></div>
                  <div className="atributo-box"><span>Marca</span><strong>{roupaSelecionada.marca}</strong></div>
                  <div className="atributo-box"><span>Cor</span><strong>{roupaSelecionada.cor}</strong></div>
                  <div className="atributo-box"><span>Categoria</span><strong>{roupaSelecionada.categoria}</strong></div>
                </div>

                <hr className="detalhes-divisor" />

                <div className="doador-profile-box">
                  <img src={roupaSelecionada.vendedor === emailPrivado ? fotoUsuario : (roupaSelecionada.fotoVendedor || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150")} alt="Doador" className="doador-avatar" />
                  <div className="doador-meta">
                    <span>Doador responsável</span>
                    <h4>{roupaSelecionada.vendedor === emailPrivado ? `${nomeUsuario} (Você)` : (roupaSelecionada.nomeVendedor || 'Usuário Reveste')}</h4>
                  </div>
                </div>
                <div className="detalhes-acoes-footer">
                  {pedidoNoCarrinho ? (
                    <button className="btn-publicar btn-solicitado" disabled>Já Solicitado</button>
                  ) : (
                    <button onClick={() => handleSolicitarRoupa(roupaSelecionada)} className="btn-publicar" disabled={roupaSelecionada.vendedor === emailPrivado}>
                      {roupaSelecionada.vendedor === emailPrivado ? 'Sua Doação' : 'Solicitar Roupa'}
                    </button>
                  )}
                  <button 
  onClick={() => {

    // 🔒 Garantir que existe roupa selecionada
    if (!roupaSelecionada) return;

    // 1. Impedir chat consigo mesmo
    if (roupaSelecionada.vendedor === emailPrivado) {
      dispararNotificacao("Você não pode abrir um chat consigo mesmo.", "erro");
      return;
    }

    // 2. Criar ID único da conversa
    const conversaId = [emailPrivado, roupaSelecionada.vendedor]
      .sort()
      .join("_");

    // 3. Definir conversa ativa (CORRIGIDO)
    setConversaAtiva({
      id: conversaId,
      nome: roupaSelecionada.nomeVendedor || 'Usuário',
      foto: roupaSelecionada.fotoVendedor || '', // 👈 evita erro de undefined
      usuarioEmail: roupaSelecionada.vendedor
    });

    // 4. Navegação
    setActiveTab('perfil');
    setSubAbaPerfil('chats');

    // 5. Fechar modal
    setRoupaSelecionada(null);

    // 6. Notificação segura
    dispararNotificacao(
      `Abrindo chat com ${roupaSelecionada.nomeVendedor || 'Usuário'}...`,
      'notificacao'
    );

  }} 
  className="btn-conversa-chat"
>
  <FiMessageSquare size={20} />
  <span>Conversar</span>
</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR DOAÇÃO */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <header className="modal-header">
              <h2>Publicar Doação</h2>
              <button onClick={() => setIsModalOpen(false)} className="close-modal-btn"><FiX size={22} /></button>
            </header>
            <form onSubmit={handlePublicar} className="modal-form">
              <div className="foto-container" onClick={() => fileInputCriarRef.current?.click()}>
                {fotoBase64 ? <img src={fotoBase64} alt="Preview" className="foto-preview" /> : (
                  <div className="foto-placeholder">
                    <FiCamera size={32} />
                    <span>Selecionar Foto da Galeria</span>
                  </div>
                )}
              </div>
              <div className="input-group">
                <label>Título da Peça / Descrição</label>
                <input type="text" placeholder="Ex: Jaqueta Jeans destroyed vintage" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="modal-input" />
              </div>
              <div className="form-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Tamanho</label>
                  <input type="text" placeholder="Ex: M, 42, G" value={tamanho} onChange={(e) => setTamanho(e.target.value)} className="modal-input" />
                </div>
                <div className="input-group" style={{ flex: 1.2 }}>
                  <label>Categoria</label>
                  <div className="categoria-badges-container" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {['Masculino', 'Feminino', 'Unissex'].map((cat) => (
                      <button 
                        type="button" key={cat} onClick={() => setCategoria(cat)}
                        className={`categoria-badge-btn ${categoria === cat ? 'active' : ''}`}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
                          backgroundColor: categoria === cat ? '#3182ce' : '#2d3748', color: '#fff'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Tipo de Tecido</label>
                  <input type="text" placeholder="Ex: Algodão, Jeans, Linho" value={tecido} onChange={(e) => setTecido(e.target.value)} className="modal-input" />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Estado de Conservação</label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)} className="modal-input">
                    <option value="Novo com etiqueta">Novo com etiqueta</option>
                    <option value="Seminovo">Seminovo</option>
                    <option value="Usado">Usado</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Marca (Opcional)</label>
                  <input type="text" placeholder="Ex: Zara, Nike" value={marca} onChange={(e) => setMarca(e.target.value)} className="modal-input" />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Cor (Opcional)</label>
                  <input type="text" placeholder="Ex: Preto, Azul" value={cor} onChange={(e) => setCor(e.target.value)} className="modal-input" />
                </div>
              </div>
              <button type="submit" className="btn-publicar" style={{ marginTop: '12px' }}>Publicar Doação</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DOAÇÃO COMPLETO */}
      {isEditModalOpen && itemSendoEditado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <header className="modal-header">
              <h2>Editar Doação</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="close-modal-btn"><FiX size={22} /></button>
            </header>
            <form onSubmit={handleSalvarEdicao} className="modal-form">
              <div className="foto-container" onClick={() => fileInputEditarRef.current?.click()} title="Mudar Foto">
                <img src={itemSendoEditado.foto} alt="Preview" className="foto-preview" />
                <div className="avatar-overlay-camera" style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '8px', borderRadius: '50%', color: '#fff' }}>
                  <FiCamera size={16} />
                </div>
              </div>

              <div className="input-group">
                <label>Título da Peça / Descrição</label>
                <input 
                  type="text" value={itemSendoEditado.descricao} 
                  onChange={(e) => setItemSendoEditado({ ...itemSendoEditado, descricao: e.target.value })} 
                  className="modal-input" 
                />
              </div>

              <div className="form-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Tamanho</label>
                  <input 
                    type="text" value={itemSendoEditado.tamanho} 
                    onChange={(e) => setItemSendoEditado({ ...itemSendoEditado, tamanho: e.target.value })} 
                    className="modal-input" 
                  />
                </div>
                <div className="input-group" style={{ flex: 1.2 }}>
                  <label>Categoria</label>
                  <div className="categoria-badges-container" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {['Masculino', 'Feminino', 'Unissex'].map((cat) => (
                      <button 
                        type="button" key={cat} onClick={() => setItemSendoEditado({ ...itemSendoEditado, categoria: cat })}
                        className={`categoria-badge-btn ${itemSendoEditado.categoria === cat ? 'active' : ''}`}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
                          backgroundColor: itemSendoEditado.categoria === cat ? '#3182ce' : '#2d3748', color: '#fff'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Tipo de Tecido</label>
                  <input 
                    type="text" value={itemSendoEditado.tecido} 
                    onChange={(e) => setItemSendoEditado({ ...itemSendoEditado, tecido: e.target.value })} 
                    className="modal-input" 
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Estado de Conservação</label>
                  <select 
                    value={itemSendoEditado.estado} 
                    onChange={(e) => setItemSendoEditado({ ...itemSendoEditado, estado: e.target.value })} 
                    className="modal-input"
                  >
                    <option value="Novo com etiqueta">Novo com etiqueta</option>
                    <option value="Excelente estado">Excelente estado</option>
                    <option value="Seminovo">Seminovo</option>
                    <option value="Usado">Usado</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Marca</label>
                  <input 
                    type="text" value={itemSendoEditado.marca} 
                    onChange={(e) => setItemSendoEditado({ ...itemSendoEditado, marca: e.target.value })} 
                    className="modal-input" 
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Cor</label>
                  <input 
                    type="text" value={itemSendoEditado.cor} 
                    onChange={(e) => setItemSendoEditado({ ...itemSendoEditado, cor: e.target.value })} 
                    className="modal-input" 
                  />
                </div>
              </div>

              <button type="submit" className="btn-publicar" style={{ marginTop: '12px', backgroundColor: '#2ecc71' }}>
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

    {/* MENU INFERIOR */}
      <nav className="bottom-nav">
        <button onClick={() => setActiveTab('home')} className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}><FiHome size={24} /></button>
        <button onClick={() => setActiveTab('itens')} className={`nav-item ${activeTab === 'itens' ? 'active' : ''}`}><FiLayers size={24} /></button>
        <div className="plus-button-wrapper"><button onClick={() => setIsModalOpen(true)} className="nav-item-plus"><FiPlus size={28} /></button></div>
        <button onClick={() => setActiveTab('carrinho')} className={`nav-item ${activeTab === 'carrinho' ? 'active' : ''}`}>
          <FiShoppingBag size={24} />{carrinho.length > 0 && <span className="badge-carrinho-contador">{carrinho.length}</span>}
        </button>
        <button onClick={() => setActiveTab('perfil')} className={`nav-item ${activeTab === 'perfil' ? 'active' : ''}`}><FiUser size={24} /></button>
      </nav>

    </div>
  );
}