import csv
import glob
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
import urllib3
from webdriver_manager.chrome import ChromeDriverManager

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

print("===================================================")
print("       SUPER ROBÔ DE AUTOMATIZAÇÃO BG LEILÕES      ")
print("===================================================")
print("[INFO] MODO EXTREMO COM FILTRO INTELIGENTE ATIVADO")
print("[INFO] Cortando dados desnecessários e Login Automático")
print("===================================================\n")

BAIXAR_E_ENVIAR_FOTOS = True

# --- CONFIGURAÇÕES DE PASTAS E MEMÓRIA ---
pasta_atual = os.path.dirname(os.path.abspath(__file__))
pasta_fotos = os.path.join(pasta_atual, "imagens_salvas")
caminho_csv_caixa = os.path.join(pasta_atual, "planilha_atualizada.csv")
caminho_csv_enriquecido = os.path.join(pasta_atual, "planilha_completa_enriquecida.csv")
arquivo_memoria = os.path.join(pasta_atual, "memoria_fotos_enviadas.txt")

os.makedirs(pasta_fotos, exist_ok=True)
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

imoveis_ja_enviados = set()
if os.path.exists(arquivo_memoria):
    with open(arquivo_memoria, "r") as f:
        imoveis_ja_enviados = set(f.read().splitlines())

fotos_para_upload_hoje = []
imoveis_novos_hoje = set()

# ==========================================
# FASE 1: BAIXAR PLANILHA DA CAIXA
# ==========================================
print("\n[FASE 1] Acessando a Caixa e baixando a planilha oficial...")
opcoes = webdriver.ChromeOptions()
prefs = {"download.default_directory": pasta_atual, "download.prompt_for_download": False}
opcoes.add_experimental_option("prefs", prefs)

servico = Service(ChromeDriverManager().install())
navegador = webdriver.Chrome(service=servico, options=opcoes)
navegador.maximize_window()

navegador.get("https://venda-imoveis.caixa.gov.br/sistema/download-lista.asp")
time.sleep(3)

Select(navegador.find_element(By.TAG_NAME, "select")).select_by_visible_text("MG")
navegador.find_element(By.XPATH, "//button[contains(text(), 'Próximo')]").click()

print("Aguardando 10 segundos para o download da planilha...")
time.sleep(10)

arquivos_csv = glob.glob(os.path.join(pasta_atual, "*.csv"))
if arquivos_csv:
    arquivo_mais_recente = max(
        [f for f in arquivos_csv if "planilha_completa_enriquecida" not in f],
        key=os.path.getctime
    )
    if arquivo_mais_recente != caminho_csv_caixa:
        if os.path.exists(caminho_csv_caixa):
            os.remove(caminho_csv_caixa)
        os.rename(arquivo_mais_recente, caminho_csv_caixa)

# ==========================================
# FASE 2: ENRIQUECER DADOS E BAIXAR FOTOS
# ==========================================
print("\n[FASE 2] Lendo planilha original e baixando fotos novas em alta velocidade...")

linhas_originais = []
fieldnames_originais = []

with open(caminho_csv_caixa, "r", encoding="latin-1") as f:
    leitor = csv.reader(f, delimiter=";")
    cabecalho_encontrado = False
    for linha in leitor:
        if not linha: continue
        if not cabecalho_encontrado:
            if any(any(t in col.strip().lower() for t in ["nº", "n°", "numero", "imovel"]) for col in linha):
                fieldnames_originais = [col.strip() if col.strip() else f"coluna_{i}" for i, col in enumerate(linha)]
                cabecalho_encontrado = True
            continue
        linha_dict = {}
        for i, col_name in enumerate(fieldnames_originais):
            linha_dict[col_name] = linha[i] if i < len(linha) else ""
        linhas_originais.append(linha_dict)

coluna_numero = None
coluna_desc = None
for col in fieldnames_originais:
    if any(t in col.lower() for t in ["nº", "n°", "numero", "imovel"]): coluna_numero = col
    if "descri" in col.lower(): coluna_desc = col

def baixar_fotos(linha_dict):
    apenas_num = re.sub(r"\D", "", str(linha_dict.get(coluna_numero, "")))
    if not apenas_num or not BAIXAR_E_ENVIAR_FOTOS or apenas_num in imoveis_ja_enviados:
        return None
    
    num_formatado = apenas_num.zfill(13)
    finais_fotos = ["21.jpg", "22.jpg", "23.jpg", "24.jpg", "01.jpg", "02.jpg", "03.jpg"]
    fotos_baixadas = []
    
    for final in finais_fotos:
        try:
            link_foto = f"https://venda-imoveis.caixa.gov.br/fotos/F{num_formatado}{final}"
            res_foto = requests.get(link_foto, headers=HEADERS, timeout=5, verify=False)
            if res_foto.status_code == 200:
                caminho_foto_salva = os.path.join(pasta_fotos, f"{apenas_num}_{final}")
                with open(caminho_foto_salva, "wb") as f_img:
                    f_img.write(res_foto.content)
                fotos_baixadas.append(caminho_foto_salva)
        except: pass
    
    return {"numero": apenas_num, "fotos": fotos_baixadas}

with ThreadPoolExecutor(max_workers=10) as executor:
    resultados_fotos = list(executor.map(baixar_fotos, linhas_originais))
    for res in resultados_fotos:
        if res and res["fotos"]:
            imoveis_novos_hoje.add(res["numero"])
            fotos_para_upload_hoje.extend(res["fotos"])

print("\n🚨 INICIANDO RASPAGEM COM FILTRO INTELIGENTE 🚨")
print("O Chrome vai abrir página por página (Tempo estimado: 20 min).")

total = len(linhas_originais)
for i, linha_dict in enumerate(linhas_originais, 1):
    apenas_num = re.sub(r"\D", "", str(linha_dict.get(coluna_numero, "")))
    if not apenas_num: continue

    num_formatado = apenas_num.zfill(13)
    url_detalhes = f"https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnImovel={num_formatado}"
    
    try:
        navegador.get(url_detalhes)
        time.sleep(1) 
        
        soup = BeautifulSoup(navegador.page_source, "html.parser")
        texto_completo = soup.get_text(separator=" | ", strip=True)
        
        info_adicional = []
        
        m_leilao = re.search(r"(1º\s*Leilão|2º\s*Leilão|Data do Leilão|Data da Licitação|Data do Evento)[\s\|]*([\d/]{10}(?:[\s\|]*(?:às\s*)?[\d:]{5})?)", texto_completo, re.I)
        m_online = re.search(r"(Término da oferta|Encerramento da Venda|Disponível até|Término|Oferta válida até)[\s\|]*([\d/]{10}(?:[\s\|]*(?:às\s*)?[\d:]{5})?)", texto_completo, re.I)
        
        if m_leilao: info_adicional.append(f"DATA DO LEILÃO/LICITAÇÃO: {m_leilao.group(2).replace('|', '').strip()}")
        if m_online: info_adicional.append(f"PRAZO DA VENDA ONLINE: {m_online.group(2).replace('|', '').strip()}")
            
        # O FILTRO INTELIGENTE: Corta as palavras indesejadas (Baixar edital, Topo, Voltar, Dê seu lance, etc)
        m_despesas = re.search(r"REGRAS PARA PAGAMENTO DAS DESPESAS[^\|]*\|(.*?)(?=\| Corretores credenciados|\| Imóveis assemelhados|\| Faça uma proposta|\| Baixar edital|\| \(Edital|\| Dê seu lance|\| Voltar|\| Topo|\| Galeria|$)", texto_completo, re.I)
        if m_despesas: info_adicional.append(f"DESPESAS (IPTU/Condomínio): {m_despesas.group(1).replace(' | ', ' - ')}")
            
        m_pag = re.search(r"FORMAS DE PAGAMENTO ACEITAS[^\|]*\|(.*?)(?=\| REGRAS PARA PAGAMENTO|\| Corretores|\| Baixar edital|\| \(Edital|\| Dê seu lance|$)", texto_completo, re.I)
        if m_pag: info_adicional.append(f"FORMAS DE PAGAMENTO: {m_pag.group(1).replace(' | ', ' - ')}")
        
        info_adicional.append(f"LINK OFICIAL: {url_detalhes}")
            
        if info_adicional and coluna_desc:
            desc_original = str(linha_dict.get(coluna_desc, ""))
            linha_dict[coluna_desc] = desc_original + " \n\n=== INFORMAÇÕES EXTRAS DA CAIXA ===\n" + "\n".join(info_adicional)
            print(f"[{i}/{total}] SUCESSO: Textos filtrados e copiados -> Imóvel {apenas_num}")
        else:
            print(f"[{i}/{total}] AVISO: Imóvel sem regras extras -> {apenas_num}")

    except Exception as e:
        print(f"[{i}/{total}] ERRO: Problema na página do imóvel -> {apenas_num}")

if imoveis_novos_hoje:
    with open(arquivo_memoria, "a") as f_memoria:
        for num_novo in imoveis_novos_hoje:
            f_memoria.write(f"{num_novo}\n")

with open(caminho_csv_enriquecido, "w", newline="", encoding="utf-8-sig") as f_saida:
    escritor = csv.DictWriter(f_saida, fieldnames=fieldnames_originais, delimiter=";")
    escritor.writeheader()
    escritor.writerows(linhas_originais)

# ==========================================
# FASE 3: UPLOAD AUTOMÁTICO NO SITE (COM LOGIN AUTOMÁTICO VIA TECLADO)
# ==========================================
print("\n[FASE 3] Acessando a tela de Login do seu site...")
navegador.get("https://bgleiloes.com/login")
time.sleep(3) 

try:
    print("Preenchendo login automaticamente e apertando [ENTER]...")
    campo_email = navegador.find_element(By.XPATH, "//input[@type='email' or contains(@name, 'email')]")
    campo_email.send_keys("bgleiloes9@gmail.com")
    time.sleep(1)
    
    campo_senha = navegador.find_element(By.XPATH, "//input[@type='password' or contains(@name, 'password')]")
    campo_senha.send_keys("BernardoG")
    time.sleep(1)
    
    # Simula o clique na tecla ENTER do teclado em vez de clicar no botão (Evita bloqueios do site)
    campo_senha.send_keys(Keys.RETURN)
    
    print("Login efetuado! Aguardando o sistema redirecionar...")
    time.sleep(6)
    
except Exception as e:
    print(f"[AVISO] Não foi possível fazer o login automático: {e}")
    input("Faça o login manualmente e aperte [ENTER] aqui para continuar...")

try:
    print("\nNavegando para o Painel Administrativo de Automação...")
    navegador.get("https://bgleiloes.com/admin")
    time.sleep(5)

    campos_arquivo = navegador.find_elements(By.XPATH, "//input[@type='file']")
    
    if len(campos_arquivo) > 0:
        campo_csv = campos_arquivo[0]
        navegador.execute_script("arguments[0].style.display = 'block';", campo_csv)
        campo_csv.send_keys(caminho_csv_enriquecido)

        botao_csv = navegador.find_element(By.XPATH, "//button[contains(., 'CSV')] | //input[contains(@value, 'CSV')]")
        navegador.execute_script("arguments[0].click();", botao_csv)
        print("Planilha ENXUTA enviada com sucesso! Aguardando 10s...")
        time.sleep(10)
        
        if len(campos_arquivo) >= 2 and len(fotos_para_upload_hoje) > 0:
            campo_fotos = campos_arquivo[1]
            navegador.execute_script("arguments[0].style.display = 'block';", campo_fotos)
            caminhos_formatados = "\n".join(fotos_para_upload_hoje)
            campo_fotos.send_keys(caminhos_formatados)
            botao_fotos = navegador.find_element(By.XPATH, "//button[contains(., 'Fotos')] | //input[contains(@value, 'Fotos')]")
            navegador.execute_script("arguments[0].click();", botao_fotos)
            print("Fotos enviadas com sucesso!")

    print("\n" + "=" * 70)
    print("🚨 UPLOAD CONCLUÍDO! 🚨")
    print("Agora que o texto está limpo e pequeno, o banco de dados do seu site aceitará!")
    print("Vá no seu site e clique no botão laranja 'Publicar mudanças no site'")
    print("=" * 70 + "\n")

except Exception as e:
    print(f"\n[ERRO] Falha no upload automático: {e}")

input("\nProcesso Finalizado! Pressione [ENTER] para fechar o robô...")
navegador.quit()
