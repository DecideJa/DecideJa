//
// SUPABASE HANDLING
//
// Como aprendido em algoritmos e Linguagem de Programação I, vamos seguir
// os pilares da POO!
// O código antes apresentado provavelmente foi uma das coisas mais horrendas já escritas
// estava dificultando coisas fáceis, adicionando uma redundância absurdamente desnecessária,
// além de que cada vez q vc precisava de algo do banco de dados vc executava 2000 linhas de
// código que podiam ser escritas 1 única vez e o metodo chamado


const SUPABASE_URL = 'https://kkkotkknftwukirkabol.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtra290a2tuZnR3dWtpcmthYm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Nzk2MDIsImV4cCI6MjA2ODM1NTYwMn0.RvJEK16tej2O8uMbhmWwxEUSRDA0fSIZyxIVi5cs82U';

import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.56.1/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


export class SupabaseService {
    constructor() {
        this.supabase = supabase;
    }


    selectArea() {
        supabase.from('area').select('*');
    }

    // MÉTODO ANTIGO (compatibilidade)
    async getUniversidadesQuery(termo) {
        let query = this.supabase
            .from('universidade')
            .select(`
                *,
                municipio:municipio_codigo (codigo, nome, uf:uf_codigo(sigla), latitude, longitude),
                organizacao:organizacao_academica_codigo (codigo, descricao)
            `);

        if (termo) {
            query = query.or(`nome.ilike.%${termo}%,sigla.ilike.%${termo}%`);
        }

        return query;
    }

    // NOVOS MÉTODOS COM FILTROS
    async getUniversidadesQueryWithFilters(termo, filters = {}) {
        let query = this.supabase
            .from('universidade')
            .select(`
                *,
                municipio:municipio_codigo (codigo, nome, uf:uf_codigo(sigla, codigo), latitude, longitude),
                organizacao:organizacao_academica_codigo (codigo, descricao)
            `);

        if (termo) {
            query = query.or(`nome.ilike.%${termo}%,sigla.ilike.%${termo}%`);
        }

        // Aplicar filtros de forma encadeada (cada filtro se acumula)
        if (filters.municipio_codigo && filters.municipio_codigo !== '') {
            query = query.eq('municipio_codigo', filters.municipio_codigo);
        }
        if (filters.igc_minimo && filters.igc_minimo !== '') {
            query = query.gte('igc', parseFloat(filters.igc_minimo));
        }
        if (filters.categoria_administrativa && filters.categoria_administrativa !== '') {
            query = query.eq('categoria_administrativa', filters.categoria_administrativa);
        }
        if (filters.organizacao_academica_codigo && filters.organizacao_academica_codigo !== '') {
            query = query.eq('organizacao_academica_codigo', filters.organizacao_academica_codigo);
        }

        return query;
    }

    async getCursosQueryWithFilters(termo, filters = {}) {
        let query = this.supabase
            .from('curso')
            .select(`
                codigo, nome_completo, nome, 
                subarea:subarea_codigo (codigo, nome, area:area_codigo (codigo, nome)), 
                grau:grau_codigo (codigo, nome)
            `);

        if (termo && termo.length >= 1) {
            const pattern = `%${termo}%`;
            query = query.or(`nome.ilike.${pattern},nome_completo.ilike.${pattern}`);
        }

        // Aplicar filtros de forma encadeada (cada filtro se acumula)
        if (filters.area_codigo && filters.area_codigo !== '') {
            query = query.eq('subarea.area_codigo', filters.area_codigo);
        }
        if (filters.subarea_codigo && filters.subarea_codigo !== '') {
            query = query.eq('subarea_codigo', filters.subarea_codigo);
        }
        if (filters.grau_codigo && filters.grau_codigo !== '') {
            query = query.eq('grau_codigo', filters.grau_codigo);
        }

        return query.order('nome_completo', { ascending: true }).limit(200);
    }

    async getCidades() {
        return supabase
            .from('municipio')
            .select('codigo, nome')
            .order('nome', { ascending: true });
    }

    async getEstados() {
        return supabase
            .from('uf')
            .select('codigo, sigla, nome')
            .order('sigla', { ascending: true });
    }

    async getCategoriasAdministrativas() {
        // Busca valores únicos de categoria_administrativa da tabela universidade
        const { data } = await supabase
            .from('universidade')
            .select('categoria_administrativa');
        
        if (!data) return [];
        
        // Remove duplicatas e nulos
        const unique = [...new Set(data.map(u => u.categoria_administrativa).filter(Boolean))];
        return unique.sort();
    }

    async getOrganizacoesAcademicas() {
        return supabase
            .from('organizacaoacademica')
            .select('codigo, descricao')
            .order('descricao', { ascending: true });
    }

    async getAreas() {
        return supabase
            .from('area')
            .select('codigo, nome')
            .order('nome', { ascending: true });
    }

    async getSubareasByArea(areaCodigo) {
        return supabase
            .from('subarea')
            .select('codigo, nome')
            .eq('area_codigo', areaCodigo)
            .order('nome', { ascending: true });
    }

    async getGraus() {
        return supabase
            .from('grau')
            .select('codigo, nome')
            .order('nome', { ascending: true });
    }

    async getArea() {
        return supabase
            .from("area")
            .select("*");
    }

    async getCursos() {
        return supabase
            .from("curso")
            .select(`*,
            subarea:subarea_codigo(nome),
            grau:grau_codigo(nome)
        `);
    }

    async getSubarea(){
        return supabase
        .from("Subarea")
        .select('codigo, nome');
    }

    async getCampus() {
        // Retorna campus com município (incluindo latitude/longitude) e dados básicos da universidade
        return supabase
            .from("campus")
            .select(`
                *,
                municipio:municipio_codigo (codigo, nome, uf:uf_codigo(sigla, codigo), latitude, longitude),
                universidade:universidade_codigo (codigo, nome, sigla, logo, categoria_administrativa, igc, organizacao_academica:organizacao_academica_codigo(codigo, descricao))
            `);
    }
    async getMunicipio(){
        return supabase 
        .from("municipio")
        .select("*");
    }

    async getUsuario(){
        return supabase
        .from("usuario")
        .select("*");
    }
}
