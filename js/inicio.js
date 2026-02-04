import { SupabaseService } from "../js/supabase.js";
import { criarCardUniversidade, menus } from "../js/main.js";


const supabaseService = new SupabaseService();


async function carregarMelhorAvaliadas() {
    const container = document.getElementById('carousel-melhorAvaliadas');
    container.innerHTML = '<p>Carregando...</p>';
    const { data: universidades, error } = await supabaseService.getUniversidadesQuery('');
    if (error || !universidades) {
        container.innerHTML = '<p>Erro ao carregar universidades.</p>';
        return;
    }
    const melhores = universidades
        .sort((a, b) => (b.igc || 0) - (a.igc || 0));
    /*.slice(0, 10) */
    container.innerHTML = melhores.map(criarCardUniversidade).join('');
    verificarOverflow('melhorAvaliadas');
    setupCarouselArrows('melhorAvaliadas');
}
function criarCardComDistancia(universidade) {
    // criarCardUniversidade already handles distance display properly
    return criarCardUniversidade(universidade);
}
async function carregarPertoDeVoce() {
    const container = document.getElementById('carousel-pertoDeVoce');
    container.innerHTML = '<p>Buscando campi próximos...</p>';

    try {
        // 1. Tenta obter a localização do usuário
        const userLocation = await getUserLocation({ enableHighAccuracy: true, timeout: 10000 });
        
        // 2. Busca todos os campi (cada campus tem município com lat/lon e referência à universidade)
        const { data: campi, error } = await supabaseService.getCampus();
        if (error || !campi) {
            throw new Error('Erro ao carregar campi do banco de dados.');
        }

        // 3. Mapeia os campi para adicionar a distância (usa as coordenadas do município do campus)
        const campiComDistancia = campi.map(campus => {
            if (campus.municipio && campus.municipio.latitude && campus.municipio.longitude) {
                const distancia = haversineDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    campus.municipio.latitude,
                    campus.municipio.longitude
                );
                return { ...campus, distancia };
            }
            return { ...campus, distancia: undefined };
        });

        // 4. Ordena os campi pela distância
        campiComDistancia.sort((a, b) => {
            if (a.distancia === undefined) return 1;
            if (b.distancia === undefined) return -1;
            return a.distancia - b.distancia;
        });

        // 5. Renderiza os cards: mapeia cada campus para um objeto semelhante à 'universidade' para reaproveitar criarCardComDistancia
        const html = campiComDistancia.map(campus => {
            const uni = {
                codigo: campus.universidade?.codigo || campus.codigo,
                sigla: campus.universidade?.sigla || '',
                nome: campus.universidade?.nome || campus.nome || '',
                logo: campus.universidade?.logo || '',
                municipio: campus.municipio || {},
                organizacao: campus.universidade?.organizacao || {},
                categoria_administrativa: campus.universidade?.categoria_administrativa || '',
                igc: campus.universidade?.igc || '-',
                distancia: campus.distancia
            };
            return criarCardComDistancia(uni);
        }).join('');

        container.innerHTML = html;

        container.innerHTML = html;

    } catch (err) {
        console.error("Falha ao carregar universidades próximas:", err.message);
        // 6. Fallback: Se a geolocalização falhar, carrega lista geral de campi (sem distância)
        container.innerHTML = '<p>Não foi possível obter sua localização. Carregando lista de campi...</p>';
        const { data: campiFallback, error: campiError } = await supabaseService.getCampus();
        if (campiError || !campiFallback) {
            container.innerHTML = '<p>Erro ao carregar campi.</p>';
            return;
        }

        // mapear para exibir informações da universidade associada quando possível
        container.innerHTML = campiFallback.map(campus => {
            const uni = {
                codigo: campus.universidade?.codigo || campus.codigo,
                sigla: campus.universidade?.sigla || '',
                nome: campus.universidade?.nome || campus.nome || '',
                logo: campus.universidade?.logo || '',
                municipio: campus.municipio || {},
                organizacao: campus.universidade?.organizacao || {},
                categoria_administrativa: campus.universidade?.categoria_administrativa || '',
                igc: campus.universidade?.igc || '-',
                distancia: undefined
            };
            return criarCardUniversidade(uni);
        }).join('');
    } finally {
        // 7. Configura o carrossel independentemente do sucesso ou falha
        verificarOverflow('pertoDeVoce');
        setupCarouselArrows('pertoDeVoce');
    }
}

// Verifica se tem overflow e mostra/esconde as setas
function verificarOverflow(sectionId) {
    const wrapper = document.querySelector(`#${sectionId} .cards-carousel-wrapper`);
    const carousel = document.getElementById(`carousel-${sectionId}`);
    if (carousel.scrollWidth > carousel.clientWidth) {
        wrapper.classList.add('has-overflow');
    } else {
        wrapper.classList.remove('has-overflow');
    }
}

// Scroll das setas
function setupCarouselArrows(sectionId) {
    const carousel = document.getElementById(`carousel-${sectionId}`);
    document.getElementById(`arrow-${sectionId}-left`).onclick = () => {
        carousel.scrollBy({ left: -370, behavior: 'smooth' });
    };
    document.getElementById(`arrow-${sectionId}-right`).onclick = () => {
        carousel.scrollBy({ left: 370, behavior: 'smooth' });
    };
}

document.addEventListener("DOMContentLoaded", async () => {

    menus();
    //Funcionamento Carrousel Bootstrap
    var myCarousel = document.querySelector('#carouselExampleIndicators');
    if (myCarousel) {
        var carousel = new bootstrap.Carousel(myCarousel, {
            interval: 5500,
            ride: 'carousel'
        });
    }
    await carregarMelhorAvaliadas();
    await carregarPertoDeVoce();
    // Setup reset button after DOM is ready
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', LimparCampos);
});

function LimparCampos() {
    const nameEl = document.getElementById('name');
    const mailEl = document.getElementById('mail');
    const msgEl = document.getElementById('message');
    if (nameEl) nameEl.value = '';
    if (mailEl) mailEl.value = '';
    if (msgEl) msgEl.value = '';
}
function setupCarousel(wrapperId, leftArrowId, rightArrowId) {
    const carousel = document.getElementById(wrapperId);
    const left = document.getElementById(leftArrowId);
    const right = document.getElementById(rightArrowId);

    const scrollAmount = 320; // largura do card + gap

    left.addEventListener("click", () => {
        carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });

    right.addEventListener("click", () => {
        carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
}
//busca universidade

const botaoBuscar = document.getElementById('botao-buscar');
const campoPesquisa = document.getElementById('campo-pesquisa');

if (botaoBuscar && campoPesquisa) {
    botaoBuscar.addEventListener('click', () => {
        const valor = campoPesquisa.value.trim();

        // Se o campo estiver vazio, pode-se impedir a busca
        if (valor === '') {
            alert('Digite algo para buscar.');
            return;
        }

        // Redireciona para a página de busca com o termo na URL
        window.location.href = `busca.html?query=${encodeURIComponent(valor)}`;
    });
}
// Login anônimo ao clicar em "Explorar como visitante" 
const botaoVisitante = document.getElementById('botaoContinuarSem');

if (botaoVisitante) {
    botaoVisitante.addEventListener('click', async () => {
        window.location.href = 'busca.html';

    });

}
const { data: { user }, error } = await supabaseService.supabase.auth.getUser();
if (user) {
    const criarContaEl = document.getElementById('criarConta');
    if (criarContaEl) {
        criarContaEl.style.display = 'none';
    }

}
// --- Função para pedir localização (retorna uma Promise) ---
function getUserLocation(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation API não suportada no navegador.'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                resolve({ latitude, longitude });
            },
            error => {
                let errorMessage = 'Erro desconhecido ao acessar localização.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permissão negada para acessar a localização.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Localização indisponível.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tempo de requisição de localização esgotado.';
                        break;
                }
                reject(new Error(errorMessage));
            },
            options
        );
    });
}

// --- Haversine: distância entre 2 pontos (lat/lon em graus) ---
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371.0088; // raio da Terra em km
    const toRad = v => (v * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
        + Math.cos(φ1) * Math.cos(φ2)
        * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distância em km
}

// --- Util: formatar distância ---
function formatDistance(dKm) {
    if (dKm >= 1) return `${dKm.toFixed(2)} km`;
    return `${(dKm * 1000).toFixed(0)} m`;
}

setupCarousel("carousel-melhorAvaliadas", "arrow-melhorAvaliadas-left", "arrow-melhorAvaliadas-right");

setupCarousel("carousel-pertoDeVoce", "arrow-pertoDeVoce-left", "arrow-pertoDeVoce-right");
