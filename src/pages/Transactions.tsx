import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, CheckCircle, XCircle, Download, Printer } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Transaction, TransactionType, TransactionStatus, Currency, ExchangeDirection } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vaults, setVaults] = useState(storage.getVaults());
  const [customers, setCustomers] = useState(storage.getCustomers());
  const [rates, setRates] = useState(storage.getRates());
  const [isOpen, setIsOpen] = useState(false);
  
  const [transactionNumber, setTransactionNumber] = useState('');
  const [exchangeDirection, setExchangeDirection] = useState<ExchangeDirection>('normal');
  const [amount, setAmount] = useState('');
  const [fromType, setFromType] = useState<'vault' | 'customer'>('vault');
  const [toType, setToType] = useState<'vault' | 'customer'>('customer');
  const [fromVaultId, setFromVaultId] = useState('');
  const [toVaultId, setToVaultId] = useState('');
  const [fromCustomerId, setFromCustomerId] = useState('');
  const [toCustomerId, setToCustomerId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [isCashCustomer, setIsCashCustomer] = useState(false);
  const [cashCustomerName, setCashCustomerName] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTransactions();
    
    // Listen for storage changes to reload transactions when updated from Dashboard
    const handleStorageChange = () => {
      loadTransactions();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes (for same-tab updates)
    const interval = setInterval(() => {
      loadTransactions();
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadTransactions = () => {
    setTransactions(storage.getTransactions());
    setVaults(storage.getVaults());
    setCustomers(storage.getCustomers());
    setRates(storage.getRates());
  };

  const calculateProfitLoss = (amount: number, fromCurr: Currency, toCurr: Currency): number => {
    if (fromCurr === toCurr) return 0;
    
    const currentRate = rates[0];
    if (!currentRate) return 0;

    if (fromCurr === 'SDG' && toCurr === 'AED') {
      // Buying AED with SDG
      const expectedAmount = amount / currentRate.buyRate;
      const actualAmount = amount / currentRate.sellRate;
      return (actualAmount - expectedAmount) * currentRate.sellRate;
    } else {
      // Selling AED for SDG
      const expectedAmount = amount * currentRate.sellRate;
      const actualAmount = amount * currentRate.buyRate;
      return actualAmount - expectedAmount;
    }
  };

  const handleAdd = () => {
    // Validation
    if (!transactionNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال رقم العملية',
      });
      return;
    }

    // Check for duplicate transaction number
    const existingTx = transactions.find(t => t.transactionNumber === transactionNumber.trim());
    if (existingTx) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'رقم العملية موجود مسبقاً',
      });
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال مبلغ صحيح',
      });
      return;
    }

    // Validate source - نفس التحقق للعادي والعكسي
    if (!isCashCustomer && !fromCustomerId) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب اختيار العميل المصدر',
      });
      return;
    }
    // التحقق من اسم العميل النقدي
    if (isCashCustomer && !cashCustomerName.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال اسم العميل النقدي',
      });
      return;
    }
    // يجب أن يكون إلى حساب (vault)
    if (!toVaultId) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب اختيار الحساب',
      });
      return;
    }

    const currentRate = rates[0];
    
    // Set currencies based on exchange direction
    let finalFromCurrency: Currency = 'AED';
    let finalToCurrency: Currency = 'SDG';
    
    if (exchangeDirection === 'normal') {
      // Normal: AED to SDG (درهم مقابل جنيه)
      finalFromCurrency = 'AED';
      finalToCurrency = 'SDG';
    } else {
      // Reverse: SDG to AED (جنيه مقابل درهم)
      finalFromCurrency = 'SDG';
      finalToCurrency = 'AED';
    }
    
    const profitLoss = calculateProfitLoss(amt, finalFromCurrency, finalToCurrency);

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      transactionNumber: transactionNumber.trim(),
      type: 'transfer',
      status: 'pending',
      amount: amt,
      currency: finalFromCurrency,
      customerId: customerId || undefined,
      fromVaultId: undefined,
      toVaultId: toVaultId,
      fromCustomerId: isCashCustomer ? 'cash-customer' : fromCustomerId,
      toCustomerId: undefined,
      fromCurrency: finalFromCurrency,
      toCurrency: finalToCurrency,
      exchangeDirection: exchangeDirection,
      exchangeRate: currentRate ? (exchangeDirection === 'normal' ? currentRate.buyRate : currentRate.sellRate) : undefined,
      profitLoss: profitLoss,
      notes: isCashCustomer ? `عميل نقدي: ${cashCustomerName.trim()}${notes.trim() ? ' | ' + notes.trim() : ''}` : (notes.trim() || undefined),
      createdAt: new Date().toISOString(),
      createdBy: user?.id || '1',
    };

    const updatedTransactions = [newTransaction, ...transactions];
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم الإضافة',
      description: 'تم إضافة العملية بنجاح (في انتظار التأكيد)',
    });

    resetForm();
    setIsOpen(false);
  };

  const confirmTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== 'pending') return;

    const vaultsData = storage.getVaults();
    const customersData = storage.getCustomers();
    
    if (tx.type === 'deposit') {
      const vault = vaultsData.find(v => v.id === tx.vaultId);
      if (!vault) return;
      
      if (tx.currency === 'SDG') {
        vault.balanceSDG += tx.amount;
      } else {
        vault.balanceAED += tx.amount;
      }
    } else if (tx.type === 'withdrawal') {
      const vault = vaultsData.find(v => v.id === tx.vaultId);
      if (!vault) return;
      
      // Check for negative balance
      if (tx.currency === 'SDG' && vault.balanceSDG < tx.amount) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرصيد غير كافٍ في الخزنة',
        });
        return;
      }
      if (tx.currency === 'AED' && vault.balanceAED < tx.amount) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرصيد غير كافٍ في الخزنة',
        });
        return;
      }
      
      if (tx.currency === 'SDG') {
        vault.balanceSDG -= tx.amount;
      } else {
        vault.balanceAED -= tx.amount;
      }
    } else if (tx.type === 'transfer') {
      // المبلغ يُضاف إلى حساب المستلم فقط (toVaultId)
      // لا يُخصم من أي مصدر لأن العميل النقدي دفع مباشرة
      
      // Calculate target amount with conversion
      let targetAmount = tx.amount;
      if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
        if (tx.fromCurrency === 'SDG') {
          targetAmount = tx.amount / tx.exchangeRate;
        } else {
          targetAmount = tx.amount * tx.exchangeRate;
        }
      }
      
      // Add to recipient's account (toVaultId)
      if (tx.toVaultId) {
        const toVault = vaultsData.find(v => v.id === tx.toVaultId);
        if (toVault) {
          if (tx.toCurrency === 'SDG') {
            toVault.balanceSDG += targetAmount;
          } else {
            toVault.balanceAED += targetAmount;
          }
        }
      }
    }
    
    storage.saveVaults(vaultsData);
    storage.saveCustomers(customersData);
    setVaults(vaultsData);
    setCustomers(customersData);
    
    // Update transaction status
    const updatedTx = {
      ...tx,
      status: 'confirmed' as TransactionStatus,
      confirmedAt: new Date().toISOString(),
      confirmedBy: user?.id || '1',
    };
    
    const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم التأكيد',
      description: tx.exchangeDirection === 'normal' 
        ? 'تم تأكيد وصول المبلغ وإضافته لحساب المستلم'
        : 'تم تأكيد العملية وتحديث الأرصدة',
    });
  };

  const approveTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== 'confirmed') return;

    const vaultsData = storage.getVaults();
    const mainVault = vaultsData.find(v => v.isMainVault);
    
    if (!mainVault) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الخزنة الرئيسية غير موجودة',
      });
      return;
    }
    
    // Calculate the target amount with conversion
    let targetAmount = tx.amount;
    if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
      if (tx.fromCurrency === 'SDG') {
        targetAmount = tx.amount / tx.exchangeRate;
      } else {
        targetAmount = tx.amount * tx.exchangeRate;
      }
    }
    
    // Get recipient's account (toVaultId)
    const recipientVault = vaultsData.find(v => v.id === tx.toVaultId);
    if (!recipientVault) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'حساب المستلم غير موجود',
      });
      return;
    }
    
    // Check if recipient has enough balance
    const recipientBalance = tx.toCurrency === 'SDG' ? recipientVault.balanceSDG : recipientVault.balanceAED;
    if (recipientBalance < targetAmount) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'رصيد المستلم غير كافٍ',
      });
      return;
    }
    
    // Transfer from recipient to main vault
    if (tx.toCurrency === 'SDG') {
      recipientVault.balanceSDG -= targetAmount;
      mainVault.balanceSDG += targetAmount;
    } else {
      recipientVault.balanceAED -= targetAmount;
      mainVault.balanceAED += targetAmount;
    }
    
    storage.saveVaults(vaultsData);
    setVaults(vaultsData);
    
    // Update transaction status to approved
    const updatedTx = {
      ...tx,
      status: 'approved' as TransactionStatus,
      approvedAt: new Date().toISOString(),
      approvedBy: user?.id || '1',
    };
    
    const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم الاعتماد',
      description: 'تم تحويل المبلغ من حساب المستلم إلى الخزنة الرئيسية',
    });
  };

  const cancelTransaction = (txId: string) => {
    const updatedTransactions = transactions.map(t =>
      t.id === txId ? { ...t, status: 'cancelled' as TransactionStatus } : t
    );
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم الإلغاء',
      description: 'تم إلغاء العملية',
    });
  };

  const resetForm = () => {
    setTransactionNumber('');
    setAmount('');
    setCustomerId('');
    setFromType('customer');
    setToType('vault');
    setFromVaultId('');
    setToVaultId('');
    setFromCustomerId('');
    setToCustomerId('');
    setExchangeDirection('normal');
    setNotes('');
    setIsCashCustomer(false);
    setCashCustomerName('');
  };

  const getStatusBadge = (tx: Transaction) => {
    const status = tx.status;
    
    // Check if transaction is confirmed but not approved yet
    if (status === 'confirmed' && !tx.approvedAt) {
      return <Badge className="bg-blue-500">مؤكد</Badge>;
    }
    
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">معتمد</Badge>;
      case 'confirmed':
        // If confirmed and has approvedAt, show as approved
        return tx.approvedAt ? <Badge className="bg-green-600">معتمد</Badge> : <Badge className="bg-blue-500">مؤكد</Badge>;
      case 'pending':
        return <Badge variant="secondary">في الانتظار</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">ملغي</Badge>;
    }
  };

  const getTypeName = (type: TransactionType, exchangeDirection?: ExchangeDirection) => {
    switch (type) {
      case 'deposit': return 'إيداع';
      case 'withdrawal': return 'سحب';
      case 'transfer': 
        if (exchangeDirection === 'normal') {
          return 'تحويل عادي';
        } else if (exchangeDirection === 'reverse') {
          return 'تحويل عكسي';
        }
        return 'تحويل';
    }
  };

  const handleExport = () => {
    toast({
      title: 'تصدير البيانات',
      description: 'جاري تصدير سجل العمليات...',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">العمليات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة عمليات التحويل والصرف</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="ml-2 h-4 w-4" />
            طباعة
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                عملية جديدة
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة عملية جديدة</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل العملية (ستكون في حالة انتظار حتى التأكيد)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="txNumber">رقم العملية *</Label>
                <Input
                  id="txNumber"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  placeholder="TX-001"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">نوع العملية *</Label>
                <Select value={exchangeDirection} onValueChange={(v) => {
                  setExchangeDirection(v as ExchangeDirection);
                  // إعادة تعيين القيم
                  setFromType('customer');
                  setToType('vault');
                  setFromVaultId('');
                  setToCustomerId('');
                  setIsCashCustomer(false);
                  setCashCustomerName('');
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">تحويل عادي (درهم مقابل جنيه)</SelectItem>
                    <SelectItem value="reverse">تحويل عكسي (جنيه مقابل درهم)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ {exchangeDirection === 'normal' ? '(بالدرهم)' : '(بالجنيه)'} *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000.00"
                  dir="ltr"
                />
              </div>
              
              {exchangeDirection === 'normal' ? (
                // التحويل العادي: من عميل → إلى حساب (ليس الخزنة الرئيسية)
                <>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse mb-2">
                      <input
                        type="checkbox"
                        id="cashCustomer"
                        checked={isCashCustomer}
                        onChange={(e) => {
                          setIsCashCustomer(e.target.checked);
                          if (e.target.checked) {
                            setFromCustomerId('');
                          } else {
                            setCashCustomerName('');
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="cashCustomer" className="cursor-pointer">
                        عميل نقدي (تحويل مباشر بدون رصيد)
                      </Label>
                    </div>
                    
                    {isCashCustomer ? (
                      <>
                        <Label>اسم العميل النقدي *</Label>
                        <Input
                          value={cashCustomerName}
                          onChange={(e) => setCashCustomerName(e.target.value)}
                          placeholder="أدخل اسم العميل"
                        />
                      </>
                    ) : (
                      <>
                        <Label>من العميل *</Label>
                        <Select value={fromCustomerId} onValueChange={(v) => {
                          setFromCustomerId(v);
                          setFromType('customer');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر العميل" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>إلى الحساب *</Label>
                    <Select value={toVaultId} onValueChange={(v) => {
                      setToVaultId(v);
                      setToType('vault');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                      <SelectContent>
                        {vaults
                          .filter(v => !v.isMainVault)
                          .map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                // التحويل العكسي: نفس التحويل العادي مع اختلاف السعر فقط
                <>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse mb-2">
                      <input
                        type="checkbox"
                        id="cashCustomerReverse"
                        checked={isCashCustomer}
                        onChange={(e) => {
                          setIsCashCustomer(e.target.checked);
                          if (e.target.checked) {
                            setFromCustomerId('');
                          } else {
                            setCashCustomerName('');
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="cashCustomerReverse" className="cursor-pointer">
                        عميل نقدي (تحويل مباشر بدون رصيد)
                      </Label>
                    </div>
                    
                    {isCashCustomer ? (
                      <>
                        <Label>اسم العميل النقدي *</Label>
                        <Input
                          value={cashCustomerName}
                          onChange={(e) => setCashCustomerName(e.target.value)}
                          placeholder="أدخل اسم العميل"
                        />
                      </>
                    ) : (
                      <>
                        <Label>من العميل *</Label>
                        <Select value={fromCustomerId} onValueChange={(v) => {
                          setFromCustomerId(v);
                          setFromType('customer');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر العميل" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>إلى الحساب *</Label>
                    <Select value={toVaultId} onValueChange={(v) => {
                      setToVaultId(v);
                      setToType('vault');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                      <SelectContent>
                        {vaults
                          .filter(v => !v.isMainVault)
                          .map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAdd}>إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل العمليات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">رقم العملية</TableHead>
                <TableHead className="text-center">النوع</TableHead>
                <TableHead className="text-center">المبلغ</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">التاريخ</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium text-center tabular-nums" dir="ltr">{tx.transactionNumber}</TableCell>
                  <TableCell className="text-center">{getTypeName(tx.type, tx.exchangeDirection)}</TableCell>
                  <TableCell className="text-center whitespace-nowrap tabular-nums" dir="ltr">
                    {tx.amount.toLocaleString()} {tx.currency || tx.fromCurrency}
                    {tx.type === 'transfer' && tx.fromCurrency !== tx.toCurrency && (
                      <span className="text-muted-foreground"> → {tx.toCurrency}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums" dir="ltr">
                    {tx.exchangeRate ? (
                      <span className="text-sm font-medium">
                        {tx.exchangeRate.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(tx)}</TableCell>
                  <TableCell className="text-center whitespace-nowrap" dir="ltr">
                    {new Date(tx.createdAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {tx.status === 'pending' && (
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmTransaction(tx.id)}
                        >
                          <CheckCircle className="ml-1 h-4 w-4" />
                          تأكيد
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelTransaction(tx.id)}
                        >
                          <XCircle className="ml-1 h-4 w-4" />
                          إلغاء
                        </Button>
                      </div>
                    )}
                    {tx.status === 'confirmed' && !tx.approvedAt && tx.exchangeDirection === 'normal' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveTransaction(tx.id)}
                      >
                        <CheckCircle className="ml-1 h-4 w-4" />
                        اعتماد التحويل
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;

