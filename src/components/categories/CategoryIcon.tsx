import { Tag, ShoppingBasket, Car, Coffee, Utensils, House, Heart, Shirt, Footprints, IceCream, Tent, Dog, SprayCan, Briefcase, Pizza, Wine, Sparkles, Bell, Cake, Gift, Flower, Rainbow, Bitcoin, ShoppingCart, Clipboard, Cherry, Wrench, Fish, Wind, Truck, Backpack, Soup, Palmtree, Handshake, Accessibility, Stethoscope, Bed, Dna, Syringe, CreditCard, Cpu, Magnet, Fingerprint, Key, ShoppingBag, BadgeCheck, Info, CircleHelp, Pencil, Ruler, MoveHorizontal, Globe, Laptop, Hammer, Armchair, Repeat, GraduationCap, Plane, Bus, Fuel, Smartphone, Wifi, Zap, Droplets, Dumbbell, Music, Gamepad2, Baby, Wallet, Banknote, Landmark, ArrowLeftRight, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { Category, Transaction, TransactionType } from '../../core/model';

export const categoryIcons = {
 tag: Tag, groceries: ShoppingBasket, car: Car, coffee: Coffee, dining: Utensils,
 home: House, health: Heart, clothing: Shirt, shoes: Footprints, treats: IceCream,
 outdoors: Tent, pets: Dog, cleaning: SprayCan, work: Briefcase, pizza: Pizza,
 wine: Wine, sparkle: Sparkles, bell: Bell, celebration: Cake, gifts: Gift,
 flowers: Flower, rainbow: Rainbow, bitcoin: Bitcoin, shopping: ShoppingCart,
 clipboard: Clipboard, fruit: Cherry, repairs: Wrench, fish: Fish, wind: Wind,
 delivery: Truck, backpack: Backpack, soup: Soup, vacation: Palmtree,
 charity: Handshake, accessibility: Accessibility, medical: Stethoscope, bed: Bed,
 dna: Dna, medicine: Syringe, card: CreditCard, technology: Cpu, magnet: Magnet,
 fingerprint: Fingerprint, key: Key, bag: ShoppingBag, verified: BadgeCheck,
 information: Info, help: CircleHelp, pencil: Pencil, ruler: Ruler,
 transfer: MoveHorizontal, world: Globe, laptop: Laptop, tools: Hammer,
 furniture: Armchair, recurring: Repeat, education: GraduationCap, flights: Plane,
 transit: Bus, fuel: Fuel, phone: Smartphone, internet: Wifi, electricity: Zap,
 water: Droplets, fitness: Dumbbell, music: Music, games: Gamepad2, family: Baby,
 wallet: Wallet, income: Banknote, savings: Landmark,
};
export type IconName = keyof typeof categoryIcons;
export const categoryColors = {
 amber: '#c4a44c', coral: '#cf806b', teal: '#9bd6d9', blue: '#219ef8',
 violet: '#a18aff', green: '#86c6a3', pink: '#e69bb4', neutral: '#b9b9b9',
};
export type ColorName = keyof typeof categoryColors;
const has = (object: object, key: unknown): key is string => typeof key === 'string' && Object.hasOwn(object,key);
const rules: [RegExp, IconName, ColorName][] = [
 [/grocer|supermarket|safeway|market/i,'groceries','teal'],[/coffee|cafe/i,'coffee','amber'],
 [/restaurant|dining|food|meal/i,'dining','amber'],[/fuel|gas station|charging|electrify/i,'fuel','coral'],
 [/auto|car|transport|toll|parking|ezpass|e-zpass/i,'car','coral'],[/rent|mortgage|home|housing/i,'home','blue'],
 [/health|medical|doctor|pharmacy/i,'medical','pink'],[/gym|fitness|sport/i,'fitness','green'],
 [/pet|dog|cat food/i,'pets','amber'],[/travel|flight|vacation/i,'flights','teal'],
 [/cloth|fashion|apparel/i,'clothing','pink'],[/school|educat|tuition/i,'education','blue'],
 [/electric|utilities/i,'electricity','amber'],[/internet|wifi/i,'internet','blue'],[/phone|mobile/i,'phone','teal'],
 [/insurance/i,'verified','green'],[/entertain|game/i,'games','violet'],[/music|streaming/i,'music','violet'],
 [/gift|donat|charity/i,'gifts','pink'],[/saving|invest/i,'savings','green'],
 [/salary|income|payroll/i,'income','green'],[/shopping|purchase/i,'shopping','amber'],
 [/repair|maintenance/i,'repairs','coral'],[/personal/i,'wallet','amber'],
];
export function categoryAppearance(category?: Category, fallback = ''): {icon: IconName; color: ColorName} {
 const inferred=rules.find(([pattern])=>pattern.test(category?.name || fallback));
 return {icon:has(categoryIcons,category?.icon)?category!.icon as IconName:inferred?.[1]||'tag',color:has(categoryColors,category?.color)?category!.color as ColorName:inferred?.[2]||'amber'};
}
export function CategoryIcon({ category, transaction, categories = [], name = '', type }: {
 category?: Category; transaction?: Transaction; categories?: Category[]; name?: string; type?: TransactionType;
}) {
 const c=category || (transaction && categories.find(c=>c.id===(transaction.subcategoryId||transaction.categoryId||transaction.groupId)));
 const appearance=categoryAppearance(c, name || transaction?.merchant || transaction?.description);
 const kind=type||transaction?.type;
 const Icon=kind==='income'?Banknote:kind==='refund'?RotateCcw:kind==='transfer'?ArrowLeftRight:kind==='adjustment'?SlidersHorizontal:categoryIcons[appearance.icon];
 const color=kind==='income'||kind==='refund'?categoryColors.green:kind==='transfer'?categoryColors.blue:categoryColors[appearance.color];
 return <span className="category-glyph" style={{color}} data-category-icon={kind&&kind!=='expense'?kind:appearance.icon} data-category-color={color} aria-hidden="true"><Icon size={20} strokeWidth={1.65}/></span>;
}
