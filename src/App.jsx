import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, FileText, FolderCog, History, Layers, Plus, Printer, Save, Trash2, TrendingUp, Users } from 'lucide-react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { cn, formatCurrency, today } from './lib/utils'
import initialQuotes from '../data/quotes.json'
import initialCategories from '../data/categories.json'
import initialCustomers from '../data/customers.json'

const blankItem = () => ({ id: crypto.randomUUID(), category: '', name: '', spec: '', quantity: 1, unitPrice: 0 })
const emptyQuote = () => ({
  id: crypto.randomUUID(),
  number: `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  status: '草稿',
  date: today(),
  company: { name: '工程師名稱', phone: '', address: '' },
  customer: { name: '', phone: '', address: '', contact: '' },
  items: [blankItem()],
  discount: 0,
  taxRate: 0,
  deposit: 0,
  note: '',
  computerChecks: { systemUpdate: false, lightingSync: false, preDispatchCheck: false, shipmentConfirmation: false },
})

function Field({ label, className, children }) {
  return <label className={cn('grid gap-1.5 text-sm font-medium text-slate-700', className)}><span>{label}</span>{children}</label>
}

function App() {
  const [quotes, setQuotes] = useState(initialQuotes)
  const [quote, setQuote] = useState(() => initialQuotes[0] || emptyQuote())
  const [categories, setCategories] = useState(initialCategories)
  const [categoryDraft, setCategoryDraft] = useState(initialCategories)
  const [newCategory, setNewCategory] = useState('')
  const [customers, setCustomers] = useState(initialCustomers)
  const [products, setProducts] = useState([])
  const [isImportingProducts, setIsImportingProducts] = useState(false)
  const [catalogJson, setCatalogJson] = useState('')
  const [customerDraft, setCustomerDraft] = useState(initialCustomers)
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '', phone: '', address: '' })
  const [activeTab, setActiveTab] = useState('edit')
  const [notice, setNotice] = useState('')
  
  const subtotal = useMemo(() => quote.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0), [quote.items])
  const discount = Number(quote.discount || 0)
  const tax = Math.round(Math.max(0, subtotal - discount) * Number(quote.taxRate || 0) / 100)
  const total = subtotal - discount + tax
  const balance = Math.max(0, total - Number(quote.deposit || 0))

  const showNotice = message => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }
  useEffect(() => {
    fetch('/api/data').then(async response => {
      if (response.status === 404) return null
      if (!response.ok) throw new Error('load failed')
      return response.json()
    }).then(data => {
      if (!data) return
      setQuotes(data.quotes)
      setQuote(data.quotes[0] || emptyQuote())
      setCategories(data.categories)
      setCategoryDraft(data.categories)
      setCustomers(data.customers)
      setCustomerDraft(data.customers)
      setProducts(Array.isArray(data.products) ? data.products : [])
    }).catch(() => showNotice('無法讀取伺服器資料，暫時顯示預設資料。'))
  }, [])
  const saveData = async ({ nextQuotes = quotes, nextCategories = categories, nextCustomers = customers, nextProducts = products } = {}) => {
    try {
      const response = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes: nextQuotes, categories: nextCategories, customers: nextCustomers, products: nextProducts }),
      })
      if (!response.ok) throw new Error('save failed')
      return true
    } catch {
      showNotice('儲存失敗，請確認伺服器連線與存取權限。')
      return false
    }
  }
  const importCoolpcProducts = async () => {
    if (isImportingProducts) return
    setIsImportingProducts(true)
    try {
      const response = await fetch('/api/coolpc')
      if (!response.ok) throw new Error('import failed')
      const data = await response.json()
      if (!Array.isArray(data.products) || !data.products.length) throw new Error('no products')
      if (!await saveData({ nextProducts: data.products })) return
      setProducts(data.products)
      showNotice('原價屋品項已更新，共 ' + data.products.length.toLocaleString() + ' 筆。')
    } catch {
      showNotice('無法取得原價屋品項，請稍後再試。')
    } finally {
      setIsImportingProducts(false)
    }
  }
  const importProductsFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const incoming = Array.isArray(parsed) ? parsed : parsed.products
      if (!Array.isArray(incoming) || !incoming.length) throw new Error('找不到品項清單')
      const normalized = incoming.map(product => ({
        category: String(product.category || '原價屋品項').trim(),
        name: String(product.name || '').trim(),
        spec: String(product.spec || '').trim(),
        unitPrice: Number(product.unitPrice || 0),
      })).filter(product => product.name)
      if (!normalized.length) throw new Error('品項格式不正確')
      if (!await saveData({ nextProducts: normalized })) return
      setProducts(normalized)
      showNotice('已匯入 ' + normalized.length.toLocaleString() + ' 筆品項。')
    } catch (error) {
      showNotice('品項匯入失敗：' + (error.message || '請選擇正確的 JSON 檔案。'))
    } finally {
      event.target.value = ''
    }
  }
  const importCatalogText = async () => {
    try {
      const parsed = JSON.parse(catalogJson)
      const incoming = Array.isArray(parsed) ? parsed : parsed.products
      if (!Array.isArray(incoming) || !incoming.length) throw new Error('找不到品項清單')
      const normalized = incoming.map(product => ({ category: String(product.category || '原價屋品項').trim(), name: String(product.name || '').trim(), spec: String(product.spec || '').trim(), unitPrice: Number(product.unitPrice || 0) })).filter(product => product.name)
      if (!normalized.length) throw new Error('品項格式不正確')
      if (!await saveData({ nextProducts: normalized })) return
      setProducts(normalized)
      setCatalogJson('')
      showNotice('已匯入 ' + normalized.length.toLocaleString() + ' 筆品項。')
    } catch (error) {
      showNotice('品項匯入失敗：' + (error.message || '請貼上正確的 JSON 資料。'))
    }
  }
  const updateQuote = (path, value) => {
    const [group, key] = path.split('.')
    if (key) setQuote(current => ({ ...current, [group]: { ...current[group], [key]: value } }))
    else setQuote(current => ({ ...current, [group]: value }))
  }
  const updateItem = (id, key, value) => setQuote(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, [key]: value } : item) }))
  const removeItem = id => setQuote(current => ({ ...current, items: current.items.length === 1 ? current.items : current.items.filter(item => item.id !== id) }))
  const newQuote = () => { setQuote(emptyQuote()); setActiveTab('edit') }
  const selectQuote = item => { setQuote(item); setActiveTab('edit') }

  const saveQuote = async () => {
    const updated = [...quotes.filter(item => item.id !== quote.id), { ...quote, updatedAt: new Date().toISOString() }]
    if (!await saveData({ nextQuotes: updated })) return
    setQuotes(updated)
    showNotice('報價單已儲存至伺服器。')
  }

  const deleteQuote = async item => {
    if (!window.confirm(`確定要刪除報價單 ${item.number}？此動作無法復原。`)) return
    const updated = quotes.filter(current => current.id !== item.id)
    if (!await saveData({ nextQuotes: updated })) return
    setQuotes(updated)
    if (quote.id === item.id) setQuote(updated[0] || emptyQuote())
    showNotice('報價單已刪除。')
  }

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    if (categoryDraft.some(category => category.toLocaleLowerCase() === name.toLocaleLowerCase())) return showNotice('此類別已存在。')
    setCategoryDraft(current => [...current, name])
    setNewCategory('')
  }
  const saveCategories = async () => {
    const cleaned = categoryDraft.map(category => category.trim()).filter(Boolean)
    const unique = [...new Set(cleaned)]
    if (unique.length !== cleaned.length) return showNotice('類別名稱不可重複。')
    if (!await saveData({ nextCategories: unique })) return
    setCategories(unique)
    setCategoryDraft(unique)
    showNotice('類別清單已儲存至伺服器。')
  }

  const addCustomer = () => {
    const name = (newCustomer.name || '').trim()
    if (!name) return showNotice('請輸入客戶名稱。')
    if (customerDraft.some(c => c.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return showNotice('此客戶已存在。')
    setCustomerDraft(current => [...current, {
      id: crypto.randomUUID(),
      name,
      contact: (newCustomer.contact || '').trim(),
      phone: (newCustomer.phone || '').trim(),
      address: (newCustomer.address || '').trim(),
    }])
    setNewCustomer({ name: '', contact: '', phone: '', address: '' })
  }

  const saveCustomers = async () => {
    const cleaned = customerDraft.map(c => ({
      ...c,
      name: (c.name || '').trim(),
      contact: (c.contact || '').trim(),
      phone: (c.phone || '').trim(),
      address: (c.address || '').trim(),
    })).filter(c => c.name)
    const names = cleaned.map(c => c.name.toLocaleLowerCase())
    if (new Set(names).size !== names.length) return showNotice('客戶名稱不可重複。')
    if (!await saveData({ nextCustomers: cleaned })) return
    setCustomers(cleaned)
    setCustomerDraft(cleaned)
    showNotice('客戶名單已儲存至伺服器。')
  }

    const exportExcel = (quotesToExport) => {
    if (!quotesToExport || !quotesToExport.length) return showNotice('沒有報價可匯出。')
    const headers = ['報價單編號', '狀態', '報價日期', '工程師名稱', '客戶名稱', '客戶聯絡人', '小計', '折扣', '稅率', '訂金', '報價總額', '備註', '報價品項']
    const rows = quotesToExport.map(q => {
      const subtotal = q.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
      const tax = Math.round(Math.max(0, subtotal - Number(q.discount || 0)) * Number(q.taxRate || 0) / 100)
      const total = subtotal - Number(q.discount || 0) + tax
      const items = q.items.map(item => [item.category || '', item.name || '', item.spec || '', item.quantity || 0, item.unitPrice || 0].join(' | ')).join(' / ')
      return [q.number, q.status, q.date, q.company?.name || '', q.customer?.name || '', q.customer?.contact || '', subtotal, q.discount || 0, q.taxRate || 0, q.deposit || 0, total, q.note || '', items]
    })
    const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
    const cells = values => values.map(value => '<td>' + escape(value) + '</td>').join('')
    const table = '<table border="1"><thead><tr>' + headers.map(header => '<th>' + escape(header) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + cells(row) + '</tr>').join('') + '</tbody></table>'
    const html = '<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=utf-8"></head><body>' + table + '</body></html>'
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '報價紀錄_' + new Date().toISOString().slice(0, 10) + '.xls'
    link.click()
    URL.revokeObjectURL(url)
    showNotice('Excel 檔案已匯出。')
  }


  const exportQuoteAsPDF = (q) => {
    if (!q) return showNotice('請先選取要匯出的報價單。')
    const subtotal = q.items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0)
    const tax = Math.round(Math.max(0, subtotal - Number(q.discount || 0)) * Number(q.taxRate || 0) / 100)
    const total = subtotal - Number(q.discount || 0) + tax
    const computerChecks = q.computerChecks || {}
    const itemsHtml = q.items.map(it => `<tr><td>${it.category || ''}</td><td>${it.name || ''}</td><td>${it.spec || ''}</td><td style="text-align:right">${it.quantity || 0}</td><td style="text-align:right">${it.unitPrice || 0}</td><td style="text-align:right">${(Number(it.quantity||0)*Number(it.unitPrice||0)).toFixed(2)}</td></tr>`).join('')
    const html = `<!doctype html><html><head><meta charset='utf-8'><title>${q.number}</title><meta name='viewport' content='width=device-width,initial-scale=1'><style>@page{size:A4;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0;color:#111;font-family:Arial,'Microsoft JhengHei',sans-serif;font-size:10pt}body{width:194mm}.sheet{min-height:281mm;display:flex;flex-direction:column}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:5px}.title{margin:0;font-size:20pt}.meta{font-size:9pt;text-align:right;line-height:1.5}.party{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:7px;font-size:9pt}.party section{border:1px solid #bbb;padding:5px;min-height:42px}.party b{display:block;margin-bottom:2px}.items{width:100%;border-collapse:collapse;margin-top:7px;font-size:8.5pt}.items th,.items td{border:1px solid #bbb;padding:3px 4px;vertical-align:top}.items th{background:#f3f4f6;text-align:left;white-space:nowrap}.right{text-align:right}.summary{margin:7px 0 0 auto;width:72mm;font-size:9pt}.summary div{display:flex;justify-content:space-between;padding:1px 0}.summary .total{border-top:1px solid #111;margin-top:3px;padding-top:3px;font-size:11pt;font-weight:700}.note{margin-top:6px;border-top:1px solid #bbb;padding-top:4px;font-size:8.5pt;white-space:pre-wrap}.checks{margin-top:6px;border-top:1px solid #bbb;padding-top:4px;font-size:8.5pt}.checks b{display:block;margin-bottom:3px}.checks div{display:grid;grid-template-columns:1fr 1fr;gap:2px 12px}.signatures{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:16mm;padding-top:8px;font-size:10pt}.signatures div{display:flex;align-items:flex-end;gap:4px}.signatures span{display:inline-block;flex:1;height:15mm;border-bottom:1px solid #111}</style></head><body><main class='sheet'><header class='top'><div><h1 class='title'>報價單</h1><div>${q.company?.name || ''}</div></div><div class='meta'><div>報價編號：${q.number}</div><div>日期：${q.date}</div></div></header><div class='party'><section><b>工程師資料</b><div>${q.company?.name || ''}</div><div>${q.company?.phone || ''}</div><div>${q.company?.address || ''}</div></section><section><b>客戶資料</b><div>${q.customer?.name || ''}</div><div>${q.customer?.contact ? '聯絡人：' + q.customer.contact : ''}</div><div>${q.customer?.phone || ''}</div><div>${q.customer?.address || ''}</div></section></div><table class='items'><thead><tr><th>類別</th><th>品名</th><th>規格</th><th class='right'>數量</th><th class='right'>單價</th><th class='right'>小計</th></tr></thead><tbody>${itemsHtml}</tbody></table><section class='summary'><div><span>小計</span><span>${formatCurrency(subtotal)}</span></div><div><span>折扣</span><span>${formatCurrency(Number(q.discount || 0))}</span></div><div><span>稅額</span><span>${formatCurrency(tax)}</span></div><div class='total'><span>總額</span><span>${formatCurrency(total)}</span></div></section>${q.note ? `<section class='note'><b>備註：</b>${q.note}</section>` : ''}<section class='checks'><b>電腦檢測</b><div><span>${computerChecks.systemUpdate ? '☑' : '☐'} 系統更新</span><span>${computerChecks.lightingSync ? '☑' : '☐'} 燈光同步</span><span>${computerChecks.preDispatchCheck ? '☑' : '☐'} 出機前檢查</span><span>${computerChecks.shipmentConfirmation ? '☑' : '☐'} 出貨確認</span></div></section><section class='signatures'><div><b>客戶簽收：</b><span></span></div><div><b>簽收日期：</b><span></span></div></section></main></body></html>`
    const win = window.open('about:blank', '_blank')
    if (!win) return showNotice('無法開啟新視窗，請允許跳出視窗後重試。')
    win.document.write(html)
    win.document.close()
    win.focus()
    // 使用者可透過列印對話方塊儲存為 PDF
    win.print()
  }

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
      <div className="mobile-header mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5">
        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><FileText size={19} /></div><div><h1 className="font-semibold tracking-tight">報價單管理</h1><p className="text-xs text-slate-500">伺服器儲存・快速建檔</p></div></div>
        <div className="flex items-center gap-2"><Button variant="outline" onClick={newQuote}><Plus size={16} />新增報價</Button><Button variant="outline" onClick={() => window.print()}><Printer size={16} />列印</Button><Button onClick={saveQuote}><Save size={16} />儲存</Button></div>
      </div>
    </header>
    <div className="mobile-page mx-auto max-w-[1440px] p-5 print:p-0">
      {notice && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 print:hidden">{notice}</div>}
      <div className="mb-4 text-xs text-slate-500 print:hidden">資料會儲存至伺服器；部署後由 Vercel Blob 持久保存。</div>
      <nav className="mb-5 flex gap-1 border-b border-slate-200 print:hidden" aria-label="報價單功能">
        <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 size={16} />}>商務儀表板</TabButton>
        <TabButton active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} icon={<FileText size={16} />}>編輯報價單</TabButton>
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={16} />}>報價紀錄 <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{quotes.length}</span></TabButton>
        <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<FolderCog size={16} />}>類別管理 <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{categories.length}</span></TabButton>
        <TabButton active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={16} />}>客戶管理 <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{customers.length}</span></TabButton>
      </nav>
      {activeTab === 'dashboard' && <Dashboard quotes={quotes} customers={customers} />}
      {activeTab === 'history' && <HistoryView quotes={quotes} onSelect={selectQuote} onNew={newQuote} onDelete={deleteQuote} onExportExcel={() => exportExcel(quotes)} onExportPDF={item => exportQuoteAsPDF(item)} />}
      {activeTab === 'categories' && <CategoryManager categories={categoryDraft} newCategory={newCategory} onNewCategory={setNewCategory} onAdd={addCategory} onUpdate={(index, value) => setCategoryDraft(current => current.map((category, categoryIndex) => categoryIndex === index ? value : category))} onRemove={index => setCategoryDraft(current => current.filter((_, categoryIndex) => categoryIndex !== index))} onSave={saveCategories} />}
      {activeTab === 'customers' && <CustomerManager customers={customerDraft} newCustomer={newCustomer} onNewCustomer={setNewCustomer} onAdd={addCustomer} onUpdate={(index, value) => setCustomerDraft(current => current.map((c, i) => i === index ? value : c))} onRemove={index => setCustomerDraft(current => current.filter((_, i) => i !== index))} onSave={saveCustomers} />}
      {activeTab === 'edit' && <QuoteEditor quote={quote} quotes={quotes} products={products} categories={categories} customers={customers} subtotal={subtotal} discount={discount} tax={tax} total={total} balance={balance} updateQuote={updateQuote} updateItem={updateItem} removeItem={removeItem} addItem={() => setQuote(current => ({ ...current, items: [...current.items, blankItem()] }))} onImportProducts={importCoolpcProducts} onImportFile={importProductsFile} catalogJson={catalogJson} onCatalogJson={setCatalogJson} onImportText={importCatalogText} isImportingProducts={isImportingProducts} />}
    </div>
  </main>
}

function CustomerManager({ customers, newCustomer, onNewCustomer, onAdd, onUpdate, onRemove, onSave }) {
  return <section className="max-w-4xl rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Users size={19} /></div><div><h2 className="font-semibold">客戶管理</h2><p className="mt-1 text-sm text-slate-500">管理客戶資料，可在編輯報價時快速套用。</p></div></div></div><div className="p-5"><div className="mb-5 grid gap-2 sm:grid-cols-2"><Input aria-label="新客戶名稱" placeholder="公司或姓名" value={newCustomer.name} onChange={event => onNewCustomer({ ...newCustomer, name: event.target.value })} /><Input aria-label="新客戶聯絡人" placeholder="聯絡人" value={newCustomer.contact} onChange={event => onNewCustomer({ ...newCustomer, contact: event.target.value })} /><Input aria-label="新客戶電話" placeholder="電話" value={newCustomer.phone} onChange={event => onNewCustomer({ ...newCustomer, phone: event.target.value })} /><Input aria-label="新客戶地址" placeholder="地址" value={newCustomer.address} onChange={event => onNewCustomer({ ...newCustomer, address: event.target.value })} /><div className="flex items-center gap-2"><Button variant="outline" onClick={onAdd}><Plus size={16} />新增客戶</Button></div></div><div className="grid gap-2">{customers.map((c, index) => <div key={c.id || index} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="grid grid-cols-2 gap-2"><Input aria-label={`客戶名稱 ${index + 1}`} className="h-9 bg-white" value={c.name} onChange={event => onUpdate(index, { ...c, name: event.target.value })} /><Input aria-label={`聯絡人 ${index + 1}`} className="h-9 bg-white" value={c.contact} onChange={event => onUpdate(index, { ...c, contact: event.target.value })} /></div><div className="grid grid-cols-2 gap-2"><Input aria-label={`電話 ${index + 1}`} className="h-9 bg-white" value={c.phone} onChange={event => onUpdate(index, { ...c, phone: event.target.value })} /><Input aria-label={`地址 ${index + 1}`} className="h-9 bg-white" value={c.address} onChange={event => onUpdate(index, { ...c, address: event.target.value })} /></div><div className="flex justify-end"><button aria-label={`刪除 ${c.name}`} onClick={() => onRemove(index)} className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></div>)}</div>{!customers.length && <p className="py-10 text-center text-sm text-slate-500">尚未新增任何客戶。</p>}<div className="mt-5 flex justify-end border-t border-slate-200 pt-5"><Button onClick={onSave}><Save size={16} />儲存客戶名單</Button></div></div></section>
}

function Dashboard({ quotes, customers }) {
  const { totalQuotes, totalRevenue, averageQuote, draftCount, finalizedCount, monthlyRevenue, recentQuotes, topCustomers } = useMemo(() => {
    const summary = { totalQuotes: quotes.length, totalRevenue: 0, draftCount: 0, finalizedCount: 0, monthlyRevenue: 0, topCustomers: {} }
    const currentMonth = new Date().toISOString().slice(0, 7)
    quotes.forEach(q => {
      const subtotal = q.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
      const discount = Number(q.discount || 0)
      const tax = Math.round(Math.max(0, subtotal - discount) * Number(q.taxRate || 0) / 100)
      const amount = subtotal - discount + tax
      summary.totalRevenue += amount
      if (String(q.status || '').trim() === '草稿') summary.draftCount += 1
      else summary.finalizedCount += 1
      if (String(q.date || '').slice(0, 7) === currentMonth) summary.monthlyRevenue += amount
      const customerName = q.customer?.name?.trim() || '未填客戶'
      summary.topCustomers[customerName] = (summary.topCustomers[customerName] || 0) + amount
    })
    const topCustomers = Object.entries(summary.topCustomers).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const recentQuotes = [...quotes].sort((a, b) => new Date(b.date || b.updatedAt || 0) - new Date(a.date || a.updatedAt || 0)).slice(0, 5)
    return {
      totalQuotes: summary.totalQuotes,
      totalRevenue: summary.totalRevenue,
      averageQuote: summary.totalQuotes ? Math.round(summary.totalRevenue / summary.totalQuotes) : 0,
      draftCount: summary.draftCount,
      finalizedCount: summary.finalizedCount,
      monthlyRevenue: summary.monthlyRevenue,
      topCustomers,
      recentQuotes,
    }
  }, [quotes])

  return <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">商務儀表板</h2>
          <p className="mt-1 text-sm text-slate-500">快速掌握報價與客戶狀況。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">{quotes.length} 筆報價</div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">{customers.length} 位客戶</div>
        </div>
      </div>
    </div>
    <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">報價總數</p>
            <p className="mt-2 text-2xl font-semibold">{totalQuotes}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-blue-600"><Layers size={20} /></div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">累計報價金額</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-green-600"><TrendingUp size={20} /></div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">平均每單</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(averageQuote)}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-blue-600"><Users size={20} /></div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">本月報價金額</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(monthlyRevenue)}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-700"><CalendarDays size={20} /></div>
        </div>
      </div>
    </div>

    <div className="grid gap-5 border-t border-slate-200 p-5 lg:grid-cols-[1.8fr_1.2fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">近期報價</h3>
              <p className="mt-1 text-sm text-slate-500">依日期排序，顯示最多最近 5 筆。</p>
            </div>
          </div>
          {!recentQuotes.length ? <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">目前尚無報價資料。</div> : <div className="mt-5 space-y-3">
            {recentQuotes.map(item => {
              const subtotal = item.items.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0)
              const discount = Number(item.discount || 0)
              const tax = Math.round(Math.max(0, subtotal - discount) * Number(item.taxRate || 0) / 100)
              const total = subtotal - discount + tax
              return <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.number}</p>
                    <p className="text-sm text-slate-500">{item.customer?.name || '未填客戶'} · {item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">{item.status || '草稿'}</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(total)}</p>
                  </div>
                </div>
              </div>
            })}
          </div>}
        </section>
      </div>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">報價狀態</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">草稿</p>
              <p className="mt-2 text-2xl font-semibold">{draftCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">已確認</p>
              <p className="mt-2 text-2xl font-semibold">{finalizedCount}</p>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">主要客戶</h3>
          <div className="mt-4 space-y-3">
            {topCustomers.length > 0 ? topCustomers.map(([name, value], index) => <div key={name} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-sm text-slate-600">TOP {index + 1}</p>
                <p className="mt-1 font-medium text-slate-900">{name}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(value)}</p>
            </div>) : <p className="text-sm text-slate-500">尚無客戶消費資料。</p>}
          </div>
        </section>
      </aside>
    </div>
  </section>
}

function TabButton({ active, onClick, icon, children }) {
  return <button onClick={onClick} className={cn('flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium', active ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500')}>
    {icon}{children}
  </button>
}

function QuoteEditor({ quote, quotes, products, categories, customers, subtotal, discount, tax, total, balance, updateQuote, updateItem, removeItem, addItem, onImportProducts, onImportFile, catalogJson, onCatalogJson, onImportText, isImportingProducts }) {
  const productOptions = useMemo(() => {
    const unique = new Map()
    ;[...products, ...quotes.flatMap(savedQuote => savedQuote.items || [])].forEach(product => {
      if (!product.name || !product.name.trim()) return
      const key = [product.category || '', product.name, product.spec || '', product.unitPrice || 0].join('::')
      if (!unique.has(key)) unique.set(key, product)
    })
    return [...unique.values()]
  }, [products, quotes])


  return <>
    <section className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end print:border-0 print:shadow-none"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">Quotation</p><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold">報價單</h2><Button type="button" variant="outline" size="sm" className="print:hidden" disabled={isImportingProducts} onClick={onImportProducts}>{isImportingProducts ? '更新中…' : '更新原價屋品項'}</Button><label className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 print:hidden">匯入品項 JSON<input className="sr-only" type="file" accept="application/json,.json" onChange={onImportFile} /></label><details className="print:hidden"><summary className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">貼上品項 JSON</summary><div className="mt-2 w-full space-y-2"><textarea className="min-h-28 w-full rounded-md border border-slate-200 p-2 text-xs" value={catalogJson} onChange={event => onCatalogJson(event.target.value)} placeholder="貼上從原價屋取得的 JSON 品項資料" /><Button type="button" size="sm" onClick={onImportText}>匯入貼上資料</Button></div></details></div></div><div className="grid grid-cols-2 gap-3 sm:w-[390px]"><Field label="報價單編號"><Input value={quote.number} onChange={event => updateQuote('number', event.target.value)} /></Field><Field label="報價日期"><Input type="date" value={quote.date} onChange={event => updateQuote('date', event.target.value)} /></Field></div></section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-5">
      <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 print:grid-cols-2 print:border-0 print:shadow-none">
        <div>
          <h3 className="mb-4 font-semibold">工程師資料</h3>
          <div className="grid gap-3">
            <Field label="工程師名稱"><Input value={quote.company.name} onChange={event => updateQuote('company.name', event.target.value)} /></Field>
            <Field label="聯絡電話"><Input value={quote.company.phone} onChange={event => updateQuote('company.phone', event.target.value)} /></Field>
            <Field label="工程師地址"><Input value={quote.company.address} onChange={event => updateQuote('company.address', event.target.value)} /></Field>
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold">客戶資料</h3><span className="text-xs text-slate-500">可由名單快速帶入</span></div>
          <div className="grid gap-3">
            <Field label="選擇已儲存客戶">
              <select aria-label="選擇已儲存客戶" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value="" onChange={event => {
                const selected = customers.find(customer => customer.id === event.target.value)
                if (selected) updateQuote('customer', { name: selected.name || '', contact: selected.contact || '', phone: selected.phone || '', address: selected.address || '' })
              }}>
                <option value="">選擇客戶以帶入資料</option>
                {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}{customer.contact ? `・${customer.contact}` : ''}</option>)}
              </select>
            </Field>
            <Field label="客戶名稱"><Input placeholder="請輸入客戶名稱或姓名" value={quote.customer.name} onChange={event => updateQuote('customer.name', event.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="聯絡人"><Input value={quote.customer.contact} onChange={event => updateQuote('customer.contact', event.target.value)} /></Field><Field label="聯絡電話"><Input value={quote.customer.phone} onChange={event => updateQuote('customer.phone', event.target.value)} /></Field></div>
            <Field label="客戶地址"><Input value={quote.customer.address} onChange={event => updateQuote('customer.address', event.target.value)} /></Field>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">報價品項</h3><Button size="sm" variant="outline" onClick={addItem} className="print:hidden"><Plus size={15} />新增品項</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr><th className="w-48 px-4 py-3">類別</th><th className="w-40 px-3 py-3">品名</th><th className="px-3 py-3">規格說明</th><th className="w-20 px-3 py-3 text-center">數量</th><th className="w-32 px-3 py-3 text-right">單價</th><th className="w-32 px-4 py-3 text-right">合計</th><th className="w-10 print:hidden" /></tr></thead><tbody>{quote.items.map(item => <ItemRow key={item.id} item={item} products={productOptions} categories={categories} onUpdate={updateItem} onRemove={removeItem} />)}</tbody></table></div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none"><Field label="備註"><textarea value={quote.note} onChange={event => updateQuote('note', event.target.value)} rows="3" className="flex w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></Field></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"><h3 className="mb-3 font-semibold">電腦檢測</h3><div className="grid gap-2 sm:grid-cols-2">{[['systemUpdate', '系統更新'], ['lightingSync', '燈光同步'], ['preDispatchCheck', '出機前檢查'], ['shipmentConfirmation', '出貨確認']].map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={Boolean(quote.computerChecks?.[key])} onChange={event => updateQuote('computerChecks', { ...(quote.computerChecks || {}), [key]: event.target.checked })} />{label}</label>)}</div></section>
      </div><aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:mt-5 print:w-full print:border-0 print:shadow-none"><h3 className="mb-4 font-semibold">報價摘要</h3><div className="space-y-3 text-sm"><Summary label="小計" value={subtotal} /><div className="flex items-center justify-between gap-3"><span className="text-slate-600">折扣</span><Input className="h-8 w-32 text-right" min="0" type="number" value={quote.discount} onChange={event => updateQuote('discount', event.target.value)} /></div><div className="flex items-center justify-between gap-3"><span className="text-slate-600">稅率</span><div className="flex items-center gap-1"><Input className="h-8 w-20 text-right" min="0" type="number" value={quote.taxRate} onChange={event => updateQuote('taxRate', event.target.value)} /><span>%</span></div></div><Summary label="稅額" value={tax} /><div className="border-t border-slate-200 pt-3"><Summary label="報價總額" value={total} strong /></div><div className="flex items-center justify-between gap-3"><span className="text-slate-600">訂金</span><Input className="h-8 w-32 text-right" min="0" type="number" value={quote.deposit} onChange={event => updateQuote('deposit', event.target.value)} /></div><Summary label="未收餘額" value={balance} /></div></aside></div>
  </>
}

function ItemRow({ item, products, categories, onUpdate, onRemove }) {
  const hasLegacyCategory = item.category && !categories.includes(item.category)
  return <tr className="border-t border-slate-100"><td className="p-2"><select aria-label="品項類別" className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={item.category} onChange={event => onUpdate(item.id, 'category', event.target.value)}><option value="">請選擇類別</option>{hasLegacyCategory && <option value={item.category}>{item.category}（舊類別）</option>}{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></td><td className="p-2"><Input list={'product-options-' + item.id} className="h-9" placeholder="輸入或選擇品名" value={item.name} onChange={event => { const name = event.target.value; const matched = products.find(product => product.name === name); onUpdate(item.id, 'name', name); if (matched) { onUpdate(item.id, 'spec', matched.spec || ''); onUpdate(item.id, 'unitPrice', matched.unitPrice || 0) } }} /><datalist id={'product-options-' + item.id}>{products.map(product => <option key={[product.category, product.name, product.spec, product.unitPrice].join('::')} value={product.name}>{product.spec ? product.spec + ' · ' : ''}{formatCurrency(product.unitPrice)}</option>)}</datalist></td><td className="p-2"><Input className="h-9" value={item.spec} onChange={event => onUpdate(item.id, 'spec', event.target.value)} /></td><td className="p-2"><Input className="h-9 text-center" min="0" type="number" value={item.quantity} onChange={event => onUpdate(item.id, 'quantity', event.target.value)} /></td><td className="p-2"><Input className="h-9 text-right" min="0" type="number" value={item.unitPrice} onChange={event => onUpdate(item.id, 'unitPrice', event.target.value)} /></td><td className="px-4 text-right font-medium tabular-nums">{formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</td><td className="pr-2 print:hidden"><button aria-label="刪除品項" onClick={() => onRemove(item.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></td></tr>
}

function CategoryManager({ categories, newCategory, onNewCategory, onAdd, onUpdate, onRemove, onSave }) {
  return <section className="max-w-4xl rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><FolderCog size={19} /></div><div><h2 className="font-semibold">類別管理</h2><p className="mt-1 text-sm text-slate-500">這裡的設定會直接成為報價品項的下拉選單，可隨時新增、修改或刪除。</p></div></div></div><div className="p-5"><div className="mb-5 flex gap-2"><Input aria-label="新類別名稱" placeholder="輸入新類別名稱，例如：伺服器與工作站" value={newCategory} onChange={event => onNewCategory(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onAdd() } }} /><Button variant="outline" onClick={onAdd}><Plus size={16} />新增類別</Button></div><div className="grid gap-2 sm:grid-cols-2">{categories.map((category, index) => <div key={index} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"><Input aria-label={`類別 ${index + 1}`} className="h-9 bg-white" value={category} onChange={event => onUpdate(index, event.target.value)} /><button aria-label={`刪除 ${category}`} onClick={() => onRemove(index)} className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div>)}</div>{!categories.length && <p className="py-10 text-center text-sm text-slate-500">尚未設定任何類別。</p>}<div className="mt-5 flex justify-end border-t border-slate-200 pt-5"><Button onClick={onSave}><Save size={16} />儲存類別設定</Button></div></div></section>
}

function Summary({ label, value, strong }) { return <div className={cn('flex items-center justify-between', strong && 'text-base font-bold text-blue-700')}><span className={strong ? '' : 'text-slate-600'}>{label}</span><span className="tabular-nums">{formatCurrency(value)}</span></div> }

function HistoryView({ quotes, onSelect, onNew, onDelete, onExportExcel, onExportPDF }) {
  const [viewMode, setViewMode] = useState('list')
  const [query, setQuery] = useState('')

  const normalized = q => String(q || '').toLowerCase()
  const filtered = quotes.filter(q => {
    const qLower = query.trim().toLowerCase()
    if (!qLower) return true
    return (normalized(q.number).includes(qLower) || normalized(q.customer?.name).includes(qLower) || normalized(q.company?.name).includes(qLower))
  })

  return <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold">報價紀錄</h2>
        <p className="mt-1 text-sm text-slate-500">已儲存的報價單會保留在本機 JSON 檔。</p>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Input placeholder="搜尋：客戶名稱、報價編號或工程師" value={query} onChange={e => setQuery(e.target.value)} className="mr-2" />
        <div className="flex items-center gap-2">
          <Button size="sm" variant={viewMode === 'list' ? undefined : 'outline'} onClick={() => setViewMode('list')}>清單</Button>
          <Button size="sm" variant={viewMode === 'table' ? undefined : 'outline'} onClick={() => setViewMode('table')}>表格</Button>
          <Button variant="outline" onClick={onExportExcel} className="print:hidden"><FileText size={16} />匯出 Excel</Button>
          <Button onClick={onNew}><Plus size={16} />新增報價</Button>
        </div>
      </div>
    </div>

    {!filtered.length && <div className="px-5 py-16 text-center text-sm text-slate-500">找不到符合的報價單。</div>}

    {filtered.length > 0 && viewMode === 'list' && <div className="divide-y divide-slate-100">{[...filtered].reverse().map(item => {
      const quoteTotal = item.items.reduce((sum, quoteItem) => sum + Number(quoteItem.quantity || 0) * Number(quoteItem.unitPrice || 0), 0) - Number(item.discount || 0)
      return <div key={item.id} className="flex w-full items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
        <button onClick={() => onSelect(item)} className="flex-1 text-left">
          <div>
            <p className="font-medium">{item.number}</p>
            <p className="mt-1 text-sm text-slate-500">{item.customer?.name || '未填寫客戶'} ・ {item.date}</p>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{item.status || '草稿'}</span>
            <p className="mt-2 font-semibold">{formatCurrency(quoteTotal)}</p>
          </div>
          <div className="print:hidden">
            <button aria-label="列印報價單" onClick={e => { e.stopPropagation(); onExportPDF(item) }} className="rounded border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"><Printer size={14} /></button><button aria-label={`刪除報價單 ${item.number}`} onClick={e => { e.stopPropagation(); onDelete(item) }} className="rounded border border-red-200 bg-white px-3 py-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    })}</div>}

    {filtered.length > 0 && viewMode === 'table' && <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr>
        <th className="px-4 py-3">報價編號</th>
        <th className="px-4 py-3">客戶</th>
        <th className="px-4 py-3">工程師</th>
        <th className="px-4 py-3">日期</th>
        <th className="px-4 py-3 text-right">金額</th>
        <th className="px-4 py-3">狀態</th>
        <th className="px-4 py-3 print:hidden">操作</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-100">{[...filtered].reverse().map(item => {
        const quoteTotal = item.items.reduce((sum, quoteItem) => sum + Number(quoteItem.quantity || 0) * Number(quoteItem.unitPrice || 0), 0) - Number(item.discount || 0)
        return <tr key={item.id} className="hover:bg-slate-50">
          <td className="px-4 py-3"><button onClick={() => onSelect(item)} className="text-left font-medium">{item.number}</button></td>
          <td className="px-4 py-3">{item.customer?.name || '未填寫'}</td>
          <td className="px-4 py-3">{item.company?.name || ''}</td>
          <td className="px-4 py-3">{item.date}</td>
          <td className="px-4 py-3 text-right">{formatCurrency(quoteTotal)}</td>
          <td className="px-4 py-3">{item.status || '草稿'}</td>
          <td className="px-4 py-3 print:hidden"><div className="flex items-center gap-2"><button aria-label="列印報價單" onClick={() => onExportPDF(item)} className="rounded border border-slate-200 bg-white px-3 py-1 text-sm hover:bg-slate-50">列印</button><button aria-label={`刪除報價單 ${item.number}`} onClick={() => onDelete(item)} className="rounded border border-red-200 bg-white px-3 py-1 text-sm text-red-600 hover:bg-red-50">刪除</button></div></td>
        </tr>
      })}</tbody>
    </table></div>}
  </section>
}

export default App
