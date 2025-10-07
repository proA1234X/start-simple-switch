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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Wallet } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Vault } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Vaults = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialBalanceSDG, setInitialBalanceSDG] = useState('');
  const [initialBalanceAED, setInitialBalanceAED] = useState('');
  const [isMainVault, setIsMainVault] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = () => {
    const loadedVaults = storage.getVaults();
    // تحديث الخزنة الرئيسية القديمة إذا لم تكن تحتوي على isMainVault
    const updatedVaults = loadedVaults.map(vault => {
      if (vault.id === '1' && !vault.hasOwnProperty('isMainVault')) {
        return { ...vault, isMainVault: true, initialBalanceSDG: vault.balanceSDG, initialBalanceAED: vault.balanceAED };
      }
      return vault;
    });
    
    if (JSON.stringify(updatedVaults) !== JSON.stringify(loadedVaults)) {
      storage.saveVaults(updatedVaults);
      setVaults(updatedVaults);
    } else {
      setVaults(loadedVaults);
    }
  };

  const getBuyRate = () => {
    const rates = storage.getRates();
    return rates.length > 0 ? rates[0].buyRate : 200;
  };

  const getTotalBalanceInAED = (vault: Vault) => {
    const buyRate = getBuyRate();
    const sdgInAED = vault.balanceSDG / buyRate;
    return vault.balanceAED + sdgInAED;
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال اسم الخزنة',
      });
      return;
    }

    const sdgBalance = parseFloat(initialBalanceSDG) || 0;
    const aedBalance = parseFloat(initialBalanceAED) || 0;

    const newVault: Vault = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      balanceSDG: sdgBalance,
      balanceAED: aedBalance,
      initialBalanceSDG: sdgBalance,
      initialBalanceAED: aedBalance,
      isMainVault: isMainVault,
      createdAt: new Date().toISOString(),
    };

    const updatedVaults = [...vaults, newVault];
    storage.saveVaults(updatedVaults);
    setVaults(updatedVaults);
    
    toast({
      title: 'تم الإضافة',
      description: 'تم إضافة الخزنة بنجاح',
    });

    setName('');
    setDescription('');
    setInitialBalanceSDG('');
    setInitialBalanceAED('');
    setIsMainVault(false);
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">الخزن</h1>
          <p className="text-muted-foreground mt-1">إدارة الخزن والأرصدة</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة حساب
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة حساب جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات الحساب الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الحساب</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: الحساب الرئيسي"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف (اختياري)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف قصير عن الحساب"
                />
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="checkbox"
                  id="isMainVault"
                  checked={isMainVault}
                  onChange={(e) => setIsMainVault(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isMainVault">الخزنة الرئيسية للصرافة</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialBalanceSDG">
                    {isMainVault ? 'الرصيد الافتتاحي جنيه' : 'الرصيد الافتتاحي بنكك'}
                  </Label>
                  <Input
                    id="initialBalanceSDG"
                    type="number"
                    value={initialBalanceSDG}
                    onChange={(e) => setInitialBalanceSDG(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialBalanceAED">الرصيد الافتتاحي درهم</Label>
                  <Input
                    id="initialBalanceAED"
                    type="number"
                    value={initialBalanceAED}
                    onChange={(e) => setInitialBalanceAED(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {vaults
          .sort((a, b) => (b.isMainVault ? 1 : 0) - (a.isMainVault ? 1 : 0))
          .map((vault) => (
          <Card 
            key={vault.id} 
            className={vault.isMainVault 
              ? "border-blue-500 dark:border-blue-400 border-[3px] shadow-[0_8px_30px_rgb(59,130,246,0.3)] bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/50 dark:to-blue-900/30 relative" 
              : ""}
          >
            {vault.isMainVault && (
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 rounded-t-lg"></div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className={`ml-2 h-5 w-5 ${vault.isMainVault ? 'text-blue-600 dark:text-blue-400' : 'text-primary'}`} />
                {vault.name}
              </CardTitle>
              {vault.isMainVault && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">الخزنة الرئيسية للصرافة</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {vault.description && (
                <p className="text-sm text-muted-foreground">{vault.description}</p>
              )}
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <span className="text-sm font-medium">{vault.isMainVault ? 'جنيه' : 'بنكك'}</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {vault.balanceSDG.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <span className="text-sm font-medium">درهم</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {vault.balanceAED.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <span className="text-sm font-medium">الرصيد الكلي (AED)</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {getTotalBalanceInAED(vault).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جدول الخزن</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم الخزنة</TableHead>
                <TableHead className="text-right">رصيد جنيه/بنكك</TableHead>
                <TableHead className="text-right">رصيد درهم</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaults
                .sort((a, b) => (b.isMainVault ? 1 : 0) - (a.isMainVault ? 1 : 0))
                .map((vault) => (
                <TableRow key={vault.id}>
                  <TableCell className="font-medium text-right">
                    {vault.name}
                    {vault.isMainVault && (
                      <span className="mr-2 text-xs text-primary">(رئيسية)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{vault.balanceSDG.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{vault.balanceAED.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {vault.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Date(vault.createdAt).toLocaleDateString('en-GB')}
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

export default Vaults;
