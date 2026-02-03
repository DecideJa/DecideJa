import {SupabaseService} from './supabase.js'

const supabaseService = new SupabaseService();

/*
TODO -->
    Tem que fazer:
     Verificação campos;
     Verificação Email;
     Botão reenviar email;
*/
var email = document.getElementById('email').value.trim();
document.getElementById("btn-confirmar").addEventListener("click", fluxo);

function fluxo(evt) {

    verificar(evt);
    //resetSenha();
    //updateSenha();
}


async function verificar(evt) {

    /*
    TODO:
     email --> puxa na variavel
     esse email ta no banco de dados? --> verificar()
     SIM --> manda email
     NÃO --> Redireciona para o cadastro
        Pedir se já tem cadastro ou se foi digitado incorretamente

     TODO:
      verificar()
        Não Nulo?
        query no banco de dados
            comparar email digitado e presente no banco de dados



    */

    if (email.trim() === "") {
        alert("É obrigatório que o email digitado não seja nulo!");
        evt.preventDefault();
    }
    if (email.trim() === query) {
    }


}


// Envia e-mail de redefinição
async function resetSenha(email) {
    const {data, error} = await supabaseService.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost/novaSenha.html", // página Esqueci senha
        //A funcionalidade pode ser subjetiva a forma de host kkkkkkkk
        //Então tem q cuidar a rodar p encontrar um padãro :)
    });

    if (error) {
        console.error("Erro ao enviar e-mail:", error.message);
        return {error: error.message};
    }

    return {message: "E-mail de redefinição enviado com sucesso!"};
}

// Atualiza a senha do usuário quando ele já clicou no link
async function updateSenha(novaSenha) {
    const {data, error} = await supabaseService.supabase.auth.updateUser({
        password: novaSenha,
    });

    if (error) {
        console.error("Erro ao atualizar senha:", error.message);
        return {error: error.message};
    }

    return {message: "Senha atualizada com sucesso!"};

}
