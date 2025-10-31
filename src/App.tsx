import React, { useEffect, useMemo, useState } from "react";

const currencyBRL = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "R$ 0,00";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const exampleServices: string[] = [
  "Instalar Varal de Teto",
  "Instalar Ventilador de Teto",
  "Trocar Lâmpada",
  "Pintura de Parede",
  "Instalar Tomada",
  "Trocar Interruptor",
  "Instalar Chuveiro Elétrico",
  "Limpeza de Caixa d’Água",
  "Reparo em Encanamento",
  "Desentupimento de Pia",
  "Trocar Torneira",
  "Instalar Misturador",
  "Rejunte de Piso",
  "Troca de Azulejo",
  "Instalação de Box de Vidro",
  "Troca de Fechadura",
  "Instalar Dobradiça",
  "Trocar Puxador",
  "Montagem de Armário",
  "Montagem de Cama",
  "Montagem de Mesa",
  "Instalar Cortina",
  "Instalar Persiana",
  "Trocar Vidro Quebrado",
  "Instalar Espelho",
  "Trocar Registro de Água",
  "Limpeza de Ralo",
  "Troca de Sifão",
  "Instalar Porta",
  "Regular Dobradiça",
  "Troca de Tomada Queimada",
  "Trocar Interruptor Simples",
  "Trocar Interruptor Paralelo",
  "Trocar Spot de Iluminação",
  "Instalar Luminária",
  "Pintura de Teto",
  "Pintura de Porta",
  "Pintura de Janelas",
  "Aplicação de Verniz em Madeira",
  "Impermeabilização de Parede",
  "Conserto de Vazamento",
  "Instalação de Tanque",
  "Instalar Varal de Parede",
  "Troca de Rodapé",
  "Limpeza Pós-Obra",
  "Fixação de Prateleiras",
  "Instalar Suporte de TV",
  "Trocar Ducha Higiênica",
  "Instalar Extintor",
  "Instalar Campainha",
  "Trocar Lâmpada de Emergência",
];

const generateExampleServices = () =>
  exampleServices.map((item) => ({ id: uid(), item, unidade: "unitário", valor: Math.floor(50 + Math.random() * 450) }));

type Service = { id: string; item: string; unidade: string; valor: number };
type BudgetItem = { id: string; item: string; unidade: string; valor: number; qtde: number };
type Notif = { type: "info" | "success" | "error"; text: string } | null;

type General = {
  cliente: string;
  contato: string;
  endereco: string;
  cidadeUf: string;
  data: string;
  validadeDias: number;
  deslocamento: number;
  taxas: number;
  desconto: number;
  observacoes: string;
};

const storageOrNull = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readJson = <T,>(key: string, fallback: T): T => {
  const storage = storageOrNull();
  if (!storage) return fallback;
  try {
    const saved = storage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  const storage = storageOrNull();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

export default function App(): JSX.Element {
  const [services, setServices] = useState<Service[]>(() => readJson<Service[]>("svc:list", generateExampleServices()));
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(() => readJson<BudgetItem[]>("orcamento:itens", []));
  const [general, setGeneral] = useState<General>(() =>
    readJson<General>("orcamento:geral", {
      cliente: "",
      contato: "",
      endereco: "",
      cidadeUf: "",
      data: new Date().toISOString().slice(0, 10),
      validadeDias: 15,
      deslocamento: 0,
      taxas: 0,
      desconto: 0,
      observacoes: "",
    })
  );

  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => services[0]?.id ?? null);
  const [editRow, setEditRow] = useState<Service | null>(() => services[0] ?? null);

  const [notif, setNotif] = useState<Notif>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastCsvLink, setLastCsvLink] = useState<{ href: string; name: string } | null>(null);
  const [busyRestore, setBusyRestore] = useState(false);

  useEffect(() => writeJson("svc:list", services), [services]);
  useEffect(() => writeJson("orcamento:itens", budgetItems), [budgetItems]);
  useEffect(() => writeJson("orcamento:geral", general), [general]);

  const filteredOptions = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = [...services].sort((a, b) => a.item.localeCompare(b.item, "pt-BR"));
    if (!q) return list;
    return list.filter((s) => [s.item, s.unidade, String(s.valor)].some((f) => String(f).toLowerCase().includes(q)));
  }, [services, filter]);

  const totalItens = useMemo(
    () => budgetItems.reduce((acc, it) => acc + (Number(it.valor) || 0) * (Number(it.qtde) || 1), 0),
    [budgetItems]
  );
  const totals = useMemo(() => {
    const desloc = Number(general.deslocamento) || 0;
    const taxas = Number(general.taxas) || 0;
    const desc = Number(general.desconto) || 0;
    const bruto = totalItens + desloc + taxas;
    const final = Math.max(0, bruto - desc);
    return { itens: totalItens, desloc, taxas, desconto: desc, final };
  }, [totalItens, general]);

  const selectService = (id: string) => {
    setSelectedId(id);
    const s = services.find((x) => x.id === id);
    if (s) setEditRow({ ...s });
  };
  const addNewService = () => {
    const newSvc: Service = { id: uid(), item: "Novo serviço", unidade: "unitário", valor: 0 };
    setServices((prev) => [newSvc, ...prev]);
    setSelectedId(newSvc.id);
    setEditRow({ ...newSvc });
    setNotif({ type: "success", text: "Serviço adicionado ao catálogo" });
    window.setTimeout(() => setNotif(null), 1200);
  };
  const saveCatalogEdits = () => {
    if (!editRow) return;
    setServices((prev) => prev.map((s) => (s.id === editRow.id ? { ...s, ...editRow, valor: Number(editRow.valor) || 0 } : s)));
    setNotif({ type: "success", text: "Catálogo atualizado" });
    window.setTimeout(() => setNotif(null), 1200);
  };
  const deleteFromCatalog = async (id?: string) => {
    const toRemove = id ?? selectedId;
    if (!toRemove) return;
    if (confirmDeleteId !== toRemove) {
      setConfirmDeleteId(toRemove);
      setNotif({ type: "info", text: "Confirme a exclusão deste serviço." });
      return;
    }
    try {
      setDeletingId(toRemove);
      setNotif({ type: "info", text: "Excluindo…" });
      await new Promise((r) => window.setTimeout(r, 30));
      setServices((prev) => prev.filter((s) => s.id !== toRemove));
      setDeletingId(null);
      setConfirmDeleteId(null);
      setNotif({ type: "success", text: "Excluído com sucesso" });
      window.setTimeout(() => setNotif(null), 1500);
    } catch {
      setDeletingId(null);
      setConfirmDeleteId(null);
      setNotif({ type: "error", text: "Erro ao excluir" });
    }
  };

  const normalizeNumber = (txt: unknown) => {
    if (txt === undefined || txt === null) return 0;
    let s = String(txt).trim();
    if (s === "") return 0;
    s = s.replace(/\u00A0/g, " ");
    const commaPos = s.lastIndexOf(",");
    const dotPos = s.lastIndexOf(".");
    if (commaPos > dotPos) s = s.split(".").join("").replace(",", ".");
    s = Array.from(s)
      .filter((ch) => "0123456789.-".includes(ch))
      .join("");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const parseCSVText = (text: string) => {
    const count = (str: string, ch: string) => str.split(ch).length - 1;
    const sep = count(text, ";") >= count(text, ",") ? ";" : ",";
    const lines = text.replaceAll("\r", "").split("\n").filter((l: string) => l.trim() !== "");
    if (lines.length === 0) return [] as Service[];
    const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
    const findIdx = (alts: string[]) => header.findIndex((h) => alts.some((a) => h.startsWith(a)));
    const colItem = findIdx(["item", "servi", "nome"]);
    const colUnid = findIdx(["unidade", "und", "uni"]);
    const colValor = findIdx(["valor", "valor unit", "pre"]);
    const start = colItem >= 0 && colUnid >= 0 && colValor >= 0 ? 1 : 0;
    return lines
      .slice(start)
      .map((line) => {
        const cols = line.split(sep).map((c) => c.trim());
        return {
          id: uid(),
          item: cols[colItem >= 0 ? colItem : 0] || "",
          unidade: cols[colUnid >= 0 ? colUnid : 1] || "unitário",
          valor: normalizeNumber(cols[colValor >= 0 ? colValor : 2] || 0),
        } as Service;
      })
      .filter((r) => r.item);
  };
  const parseCSV = async (file: File) => parseCSVText(await file.text());
  const importCSV = async (file: File) => {
    const rows = await parseCSV(file);
    if (rows.length === 0) {
      setNotif({ type: "error", text: "CSV vazio ou inválido" });
      return;
    }
    setServices((prev) => [...rows, ...prev]);
    setNotif({ type: "success", text: `${rows.length} serviço(s) importado(s)` });
    window.setTimeout(() => setNotif(null), 1500);
  };
  const onPickCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void importCSV(f);
    e.target.value = "";
  };

  const buildCSVModel = () => [
    "item;unidade;valor",
    "Instalar Varal de Teto;unitário;100",
    "Pintura de Parede;metro;35,50",
  ].join("\n");
  const downloadCSVModel = () => {
    try {
      setNotif({ type: "info", text: "Gerando modelo CSV…" });
      const csv = buildCSVModel();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo-servicos.csv";
      a.rel = "noopener";
      a.target = "_self";
      a.style.display = "none";
      document.body.appendChild(a);
      if (typeof (a as HTMLAnchorElement & { download?: string }).download === "undefined") {
        a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      }
      a.click();
      window.setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
        try {
          a.remove();
        } catch {
          /* ignore */
        }
      }, 100);
      const dataUrl = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      setLastCsvLink({ href: dataUrl, name: "modelo-servicos.csv" });
      setNotif({ type: "success", text: "Modelo CSV baixado" });
      window.setTimeout(() => setNotif(null), 1500);
    } catch {
      setNotif({ type: "error", text: "Falha ao baixar o modelo CSV" });
    }
  };
  const copyCSVModel = async () => {
    const csv = buildCSVModel();
    try {
      const clipboard = (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(csv);
      } else {
        const ta = document.createElement("textarea");
        ta.value = csv;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setNotif({ type: "success", text: "Modelo CSV copiado" });
      window.setTimeout(() => setNotif(null), 1500);
    } catch {
      setNotif({ type: "error", text: "Não foi possível copiar o CSV" });
    }
  };

  const addToBudget = () => {
    if (!editRow) return;
    setBudgetItems((prev) => [
      { id: uid(), item: editRow.item, unidade: editRow.unidade, valor: Number(editRow.valor) || 0, qtde: 1 },
      ...prev,
    ]);
  };
  const removeFromBudget = (id: string) => setBudgetItems((prev) => prev.filter((s) => s.id !== id));
  const updateBudget = (id: string, patch: Partial<BudgetItem>) =>
    setBudgetItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const clearAll = () => {
    if (window.confirm("Limpar todo o orçamento?")) setBudgetItems([]);
  };

  const attachExampleCatalog = () => {
    const fresh = generateExampleServices();
    const existingByName = new Set(services.map((s) => s.item.trim().toLowerCase()));
    const toAdd = fresh.filter((s) => !existingByName.has(s.item.trim().toLowerCase()));
    if (toAdd.length === 0) {
      setNotif({ type: "info", text: "Nenhum exemplo novo para anexar" });
      window.setTimeout(() => setNotif(null), 1200);
      return;
    }
    setServices((prev) => [...toAdd, ...prev]);
    setNotif({ type: "success", text: `${toAdd.length} serviço(s) de exemplo anexado(s)` });
    window.setTimeout(() => setNotif(null), 1500);
  };
  const restoreExampleCatalog = async () => {
    if (!window.confirm("Restaurar o catálogo padrão de exemplos? Isso substitui a lista atual.")) return;
    try {
      setBusyRestore(true);
      await new Promise((r) => window.setTimeout(r, 50));
      const fresh = generateExampleServices();
      setServices(fresh);
      setNotif({ type: "success", text: "Catálogo de exemplo restaurado (50+ itens)" });
      window.setTimeout(() => setNotif(null), 1500);
      const first = fresh[0];
      setSelectedId(first?.id ?? null);
      setEditRow(first ?? null);
    } finally {
      setBusyRestore(false);
    }
  };

  useEffect(() => {
    if (!selectedId || !services.some((s) => s.id === selectedId)) {
      const first = filteredOptions[0];
      if (first) {
        setSelectedId(first.id);
        setEditRow({ ...first });
      } else {
        setSelectedId(null);
        setEditRow(null);
      }
    }
  }, [services, filter, selectedId, filteredOptions]);

  useEffect(() => {
    const csv = buildCSVModel();
    console.assert(csv.split("\n").length >= 3, "[TEST] CSV model deve ter ao menos 3 linhas");
    console.assert(totals.final >= 0, "[TEST] Total final não pode ser negativo");
  }, [totals.final]);

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Orçamentos de Manutenção — Catálogo Exemplo (50+ itens)</h1>
        </div>
        {notif && (
          <div
            className={`mx-auto max-w-6xl px-4 pb-2 ${
              notif.type === "success"
                ? "text-green-700"
                : notif.type === "error"
                ? "text-red-700"
                : "text-neutral-700"
            }`}
          >
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${
                notif.type === "success"
                  ? "border-green-300 bg-green-50"
                  : notif.type === "error"
                  ? "border-red-300 bg-red-50"
                  : "border-neutral-300 bg-neutral-50"
              }`}
            >
              <span className="text-sm">{notif.text}</span>
            </div>
          </div>
        )}
        {lastCsvLink && (
          <div className="mx-auto max-w-6xl px-4 pb-3 text-neutral-700">
            <div className="inline-flex items-center gap-3 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50">
              <span className="text-sm">Modelo salvo.</span>
              <a href={lastCsvLink.href} target="_blank" rel="noopener" className="text-blue-700 underline">
                Abrir CSV
              </a>
              <span className="text-xs opacity-75">(geralmente em Downloads do navegador)</span>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <section className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Informações gerais</h2>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-neutral-500">Cliente</label>
              <input
                className="w-full px-3 py-2 border rounded-xl"
                value={general.cliente}
                onChange={(e) => setGeneral((g) => ({ ...g, cliente: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Contato</label>
              <input
                className="w-full px-3 py-2 border rounded-xl"
                value={general.contato}
                onChange={(e) => setGeneral((g) => ({ ...g, contato: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Data</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-xl"
                value={general.data}
                onChange={(e) => setGeneral((g) => ({ ...g, data: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="text-xs text-neutral-500">Endereço</label>
              <input
                className="w-full px-3 py-2 border rounded-xl"
                value={general.endereco}
                onChange={(e) => setGeneral((g) => ({ ...g, endereco: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Cidade/UF</label>
              <input
                className="w-full px-3 py-2 border rounded-xl"
                value={general.cidadeUf}
                onChange={(e) => setGeneral((g) => ({ ...g, cidadeUf: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs text-neutral-500">Validade (dias)</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 border rounded-xl"
                value={general.validadeDias}
                onChange={(e) => setGeneral((g) => ({ ...g, validadeDias: e.target.valueAsNumber || 0 }))}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Deslocamento</label>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">R$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full px-3 py-2 border rounded-xl"
                  value={general.deslocamento}
                  onChange={(e) => setGeneral((g) => ({ ...g, deslocamento: e.target.valueAsNumber || 0 }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500">Taxas gerais</label>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">R$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full px-3 py-2 border rounded-xl"
                  value={general.taxas}
                  onChange={(e) => setGeneral((g) => ({ ...g, taxas: e.target.valueAsNumber || 0 }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500">Desconto</label>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">R$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full px-3 py-2 border rounded-xl"
                  value={general.desconto}
                  onChange={(e) => setGeneral((g) => ({ ...g, desconto: e.target.valueAsNumber || 0 }))}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Observações</label>
            <textarea
              className="w-full px-3 py-2 border rounded-xl"
              rows={3}
              value={general.observacoes}
              onChange={(e) => setGeneral((g) => ({ ...g, observacoes: e.target.value }))}
            />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-white rounded-2xl shadow-sm border p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Catálogo de serviços</h2>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button onClick={addNewService} className="px-3 py-2 rounded-xl bg-black text-white hover:opacity-90">
                  + Serviço
                </button>
                <label className="px-3 py-2 rounded-xl border hover:bg-neutral-50 cursor-pointer">
                  Importar CSV
                  <input type="file" accept=".csv,text/csv" onChange={onPickCSV} className="hidden" />
                </label>
                <button type="button" onClick={downloadCSVModel} className="px-3 py-2 rounded-xl border hover:bg-neutral-50">
                  Baixar modelo CSV
                </button>
                <button type="button" onClick={copyCSVModel} className="px-3 py-2 rounded-xl border hover:bg-neutral-50">
                  Copiar CSV
                </button>
                <button type="button" onClick={attachExampleCatalog} className="px-3 py-2 rounded-xl border hover:bg-neutral-50">
                  Anexar exemplos
                </button>
                <button
                  type="button"
                  onClick={restoreExampleCatalog}
                  disabled={busyRestore}
                  className={`px-3 py-2 rounded-xl border ${busyRestore ? "opacity-60 cursor-wait" : "hover:bg-neutral-50"}`}
                >
                  {busyRestore ? "Restaurando…" : "Restaurar exemplos"}
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-neutral-500">Selecionar serviço</label>
                <select className="w-full px-3 py-2 border rounded-xl" value={selectedId ?? ""} onChange={(e) => selectService(e.target.value)}>
                  {filteredOptions.length === 0 && <option value="">Nenhum serviço</option>}
                  {filteredOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.item} — {s.unidade} — {currencyBRL(s.valor)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-500">Filtrar catálogo</label>
                <input
                  className="w-full px-3 py-2 border rounded-xl"
                  placeholder="Buscar por nome, unidade ou valor"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs text-neutral-500">Item</label>
                  <input
                    className="w-full px-3 py-2 border rounded-xl"
                    value={editRow?.item ?? ""}
                    onChange={(e) => setEditRow((r) => (r ? { ...r, item: e.target.value } : r))}
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Unidade</label>
                  <input
                    className="w-full px-3 py-2 border rounded-xl"
                    value={editRow?.unidade ?? ""}
                    onChange={(e) => setEditRow((r) => (r ? { ...r, unidade: e.target.value } : r))}
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Valor unitário (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2 border rounded-xl"
                    value={editRow?.valor ?? 0}
                    onChange={(e) => setEditRow((r) => (r ? { ...r, valor: e.target.valueAsNumber ?? 0 } : r))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 justify-end">
                <button onClick={saveCatalogEdits} className="px-3 py-2 rounded-xl border hover:bg-neutral-50">
                  Salvar no catálogo
                </button>
                <button onClick={addToBudget} className="px-3 py-2 rounded-xl border hover:bg-neutral-50">
                  Adicionar ao orçamento
                </button>
                {confirmDeleteId === selectedId ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteFromCatalog(selectedId!)}
                      disabled={!selectedId || deletingId === selectedId}
                      className={`px-3 py-2 rounded-xl border ${
                        deletingId === selectedId
                          ? "opacity-60 cursor-wait"
                          : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {deletingId === selectedId ? "Excluindo…" : "Confirmar exclusão"}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDeleteId(null);
                        setNotif(null);
                      }}
                      disabled={deletingId === selectedId}
                      className="px-3 py-2 rounded-xl border hover:bg-neutral-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => deleteFromCatalog(selectedId!)}
                    disabled={!selectedId}
                    className="px-3 py-2 rounded-xl border text-red-600 hover:bg-red-50"
                  >
                    Excluir do catálogo
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Orçamento</h2>
              <div className="flex items-center gap-2">
                <button onClick={clearAll} className="px-3 py-2 rounded-xl border hover:bg-neutral-50">
                  Limpar orçamento
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-2 w-[36%]">Item</th>
                    <th className="py-2 pr-2 w-[16%]">Unidade</th>
                    <th className="py-2 pr-2 w-[10%]">Qtd.</th>
                    <th className="py-2 pr-2 w-[18%]">Valor unitário</th>
                    <th className="py-2 pr-2 w-[12%]">Subtotal</th>
                    <th className="py-2 text-right w-[8%]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-neutral-500">
                        Nenhum item no orçamento.
                      </td>
                    </tr>
                  )}
                  {budgetItems.map((s) => (
                    <tr key={s.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-2">
                        <input
                          className="w-full px-2 py-1 border rounded-lg"
                          value={s.item}
                          onChange={(e) => updateBudget(s.id, { item: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-full px-2 py-1 border rounded-lg"
                          value={s.unidade}
                          onChange={(e) => updateBudget(s.id, { unidade: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className="w-full px-2 py-1 border rounded-lg"
                          value={Number(s.qtde) || 1}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber ?? 0;
                            if (!Number.isFinite(n) || n <= 0) {
                              removeFromBudget(s.id);
                            } else {
                              updateBudget(s.id, { qtde: Math.floor(n) });
                            }
                          }}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">R$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="w-full px-2 py-1 border rounded-lg"
                            value={s.valor}
                            onChange={(e) => updateBudget(s.id, { valor: e.target.valueAsNumber ?? 0 })}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-2 font-medium">{currencyBRL((Number(s.valor) || 0) * (Number(s.qtde) || 1))}</td>
                      <td className="py-2 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => removeFromBudget(s.id)} className="px-3 py-1.5 rounded-lg border text-red-600 hover:bg-red-50">
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {budgetItems.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={4}></td>
                      <td className="py-2">Itens</td>
                      <td className="py-2 text-right font-medium">{currencyBRL(totals.itens)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4}></td>
                      <td className="py-2">Deslocamento</td>
                      <td className="py-2 text-right font-medium">{currencyBRL(totals.desloc)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4}></td>
                      <td className="py-2">Taxas gerais</td>
                      <td className="py-2 text-right font-medium">{currencyBRL(totals.taxas)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4}></td>
                      <td className="py-2">Desconto</td>
                      <td className="py-2 text-right font-medium">− {currencyBRL(totals.desconto)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4}></td>
                      <td className="py-3 font-semibold">Total geral</td>
                      <td className="py-3 text-right font-bold">{currencyBRL(totals.final)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
