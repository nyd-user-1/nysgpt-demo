import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, ChevronLeft, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InsetPanel } from '@/components/ui/inset-panel';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import { MobileMenuIcon } from '@/components/MobileMenuButton';

// Departments (sorted alphabetically)
export const departmentPrompts = [
  { title: "Department of Agriculture and Markets", slug: "department-of-agriculture-and-markets", prompt: "What does the NYS Department of Agriculture and Markets do to support farming, food safety, and agricultural markets in New York?" },
  { title: "Department of Civil Service", slug: "department-of-civil-service", prompt: "What is the role of the NYS Department of Civil Service in managing the state workforce and civil service examinations?" },
  { title: "Department of Corrections and Community Supervision", slug: "department-of-corrections-and-community-supervision", prompt: "What does the NYS Department of Corrections and Community Supervision oversee regarding incarceration, parole, and reentry programs?" },
  { title: "Department of Economic Development", slug: "department-of-economic-development", prompt: "What does the NYS Department of Economic Development do to promote business growth and job creation across the state?" },
  { title: "Department of Environmental Conservation", slug: "department-of-environmental-conservation", prompt: "What does the NYS Department of Environmental Conservation do to protect natural resources and the environment?" },
  { title: "Department of Family Assistance", slug: "department-of-family-assistance", prompt: "What does the NYS Department of Family Assistance do, including the Office of Children and Family Services and the Office of Temporary and Disability Assistance?" },
  { title: "Department of Financial Services", slug: "department-of-financial-services", prompt: "What is the role of the NYS Department of Financial Services in regulating banking, insurance, and financial products?" },
  { title: "Department of Health", slug: "department-of-health", prompt: "What are the main responsibilities of the New York State Department of Health and how does it serve residents?" },
  { title: "Department of Labor", slug: "department-of-labor", prompt: "What does the New York State Department of Labor do and what services does it provide to workers and employers?" },
  { title: "Department of Law (Office of the Attorney General)", slug: "department-of-law", prompt: "What does the NYS Department of Law and the Office of the Attorney General do to enforce state laws and protect consumers?" },
  { title: "Department of Mental Hygiene", slug: "department-of-mental-hygiene", prompt: "What does the NYS Department of Mental Hygiene oversee, including the Office of Addiction Services and Supports, Office of Mental Health, and Office for People With Developmental Disabilities?" },
  { title: "Department of Motor Vehicles", slug: "department-of-motor-vehicles", prompt: "What services does the NYS DMV provide and how can residents access them?" },
  { title: "Department of Public Service", slug: "department-of-public-service", prompt: "What does the NYS Department of Public Service do to regulate utilities and ensure reliable energy, water, and telecommunications services?" },
  { title: "Department of State", slug: "department-of-state", prompt: "What are the functions of the New York Department of State and what services does it offer?" },
  { title: "Department of Taxation and Finance", slug: "department-of-taxation-and-finance", prompt: "What does the NYS Department of Taxation and Finance handle and how can residents interact with it?" },
  { title: "Department of Transportation", slug: "department-of-transportation", prompt: "What is the mission of the NYS Department of Transportation and how does it ensure a safe, efficient, and environmentally sound transportation system?" },
  { title: "Department of Veterans' Services", slug: "department-of-veterans-services", prompt: "How does the NYS Department of Veterans' Services advocate for veterans and their families to ensure they receive benefits earned through military service?" },
  { title: "Education Department", slug: "education-department", prompt: "What role does the New York State Education Department play in K-12 education, higher education, and professional licensing?" },
  { title: "Executive Department", slug: "executive-department", prompt: "What is the NYS Executive Department and what role does it play in the administration of state government under the Governor?" },
  { title: "Office of General Services", slug: "office-of-general-services", prompt: "What services does the NYS Office of General Services provide to support state government operations and facilities?" },
];

// Agencies (sorted alphabetically)
export const agencyPrompts = [
  { title: "511NY", slug: "511ny", prompt: "What is 511NY and how does it provide transportation information and services throughout New York State?" },
  { title: "Adirondack Park Agency", slug: "adirondack-park-agency", prompt: "What does the Adirondack Park Agency do to manage and protect the Adirondack Park in New York?" },
  { title: "Authorities Budget Office", slug: "authorities-budget-office", prompt: "What does the Authorities Budget Office do to make public authorities more accountable and transparent?" },
  { title: "Central Pine Barrens Joint Planning and Policy Commission", slug: "central-pine-barrens-commission", prompt: "What does the Central Pine Barrens Joint Planning and Policy Commission do to oversee preservation and development in Suffolk County?" },
  { title: "Commission of Correction", slug: "commission-of-correction", prompt: "What does the NYS Commission of Correction do to oversee state correctional facilities, county jails, and local police lock-ups?" },
  { title: "Commission on Ethics and Lobbying in Government", slug: "commission-on-ethics-and-lobbying", prompt: "What does the Commission on Ethics and Lobbying in Government do to enforce ethics and lobbying laws and promote transparency?" },
  { title: "Commission on Judicial Conduct", slug: "commission-on-judicial-conduct", prompt: "What does the Commission on Judicial Conduct do to investigate complaints of misconduct against judges?" },
  { title: "Commission on Prosecutorial Conduct", slug: "commission-on-prosecutorial-conduct", prompt: "What does the Commission on Prosecutorial Conduct do to strengthen oversight of New York's prosecutors?" },
  { title: "Corcraft Products", slug: "corcraft-products", prompt: "What does Corcraft Products do to employ inmates in jobs that teach work skills and help offset the cost of incarceration?" },
  { title: "Council on Children and Families Services", slug: "council-on-children-and-families", prompt: "What does the Council on Children and Families Services do to provide cross-systems solutions for interagency issues?" },
  { title: "Council on Developmental Disabilities", slug: "council-on-developmental-disabilities", prompt: "What does the NYS Council on Developmental Disabilities do to enhance the lives of New Yorkers with developmental disabilities?" },
  { title: "Council on the Arts", slug: "council-on-the-arts", prompt: "What does the New York State Council on the Arts do to preserve and expand the cultural resources of New York?" },
  { title: "Division of Consumer Protection", slug: "division-of-consumer-protection", prompt: "What does the NYS Division of Consumer Protection do to safeguard consumers and resolve complaints?" },
  { title: "Division of Criminal Justice Services", slug: "division-of-criminal-justice-services", prompt: "What does the NYS Division of Criminal Justice Services do to enhance public safety and support the criminal justice system?" },
  { title: "Division of Homeland Security and Emergency Services", slug: "division-of-homeland-security", prompt: "What does the NYS Division of Homeland Security and Emergency Services do to improve readiness, response, and recovery capabilities?" },
  { title: "Division of Human Rights", slug: "division-of-human-rights", prompt: "What does the NYS Division of Human Rights do to enforce the Human Rights Law and ensure equal opportunity for all?" },
  { title: "Division of Military and Naval Affairs", slug: "division-of-military-and-naval-affairs", prompt: "What does the NYS Division of Military and Naval Affairs oversee regarding the National Guard and military operations in New York?" },
  { title: "Division of State Police", slug: "division-of-state-police", prompt: "What is the mission of the NYS Division of State Police in serving, protecting, and defending the people of New York?" },
  { title: "Division of Tax Appeals and Tax Appeals Tribunal", slug: "division-of-tax-appeals", prompt: "What does the Division of Tax Appeals and Tax Appeals Tribunal do to resolve tax and licensing disputes?" },
  { title: "Division of the Budget", slug: "division-of-the-budget", prompt: "What does the NYS Division of the Budget do to assist the Governor in preparing the Executive Budget and managing fiscal policy?" },
  { title: "Gaming Commission", slug: "gaming-commission", prompt: "What does the NYS Gaming Commission do to regulate horse racing, lottery, commercial casinos, and charitable gaming?" },
  { title: "Geographic Information Systems (GIS)", slug: "geographic-information-systems", prompt: "What does the NYS Geospatial Advisory Council do to coordinate and promote the use of geographic information?" },
  { title: "Governor's Traffic Safety Committee", slug: "governors-traffic-safety-committee", prompt: "What does the Governor's Traffic Safety Committee do to improve highway safety and reduce traffic-related deaths?" },
  { title: "Hudson River Valley Greenway", slug: "hudson-river-valley-greenway", prompt: "What does the Hudson River Valley Greenway do to preserve natural resources while encouraging economic development?" },
  { title: "Justice Center for the Protection of People with Special Needs", slug: "justice-center-special-needs", prompt: "What does the NYS Justice Center do to support and protect people with special needs and disabilities?" },
  { title: "Liquidation Bureau", slug: "liquidation-bureau", prompt: "What does the New York Liquidation Bureau do in its capacity as receiver of impaired or insolvent insurance companies?" },
  { title: "Liquor Authority", slug: "liquor-authority", prompt: "What does the NYS Liquor Authority and Division of Alcoholic Beverage Control do to regulate alcoholic beverage licensing?" },
  { title: "MTA Inspector General", slug: "mta-inspector-general", prompt: "What does the MTA Inspector General do to preserve the quality and integrity of MTA transportation services?" },
  { title: "New York Assembly", slug: "new-york-assembly", prompt: "What is the New York State Assembly and how does it function as the lower house of the State Legislature with 150 members?" },
  { title: "New York State Bridge Authority", slug: "nys-bridge-authority-agency", prompt: "What bridges does the New York State Bridge Authority manage and maintain in the Hudson Valley?" },
  { title: "New York State Canal Corporation", slug: "nys-canal-corporation-agency", prompt: "What does the New York State Canal Corporation do to manage and maintain the state canal system?" },
  { title: "New York State Insurance Fund", slug: "nys-insurance-fund", prompt: "What does the New York State Insurance Fund do to provide workers' compensation and disability benefits insurance?" },
  { title: "New York State Law Revision Commission", slug: "law-revision-commission", prompt: "What does the NYS Law Revision Commission do to examine state laws and recommend needed reforms?" },
  { title: "New York State Senate", slug: "new-york-state-senate", prompt: "What is the New York State Senate and how does it function as the upper house of the State Legislature with 63 members?" },
  { title: "Office for New Americans", slug: "office-for-new-americans", prompt: "What does the Office for New Americans do to assist newcomers in New York State who want to contribute to the economy?" },
  { title: "Office for People With Developmental Disabilities", slug: "office-for-people-with-developmental-disabilities", prompt: "What does OPWDD do to help people with developmental disabilities access high-quality services tailored to their needs?" },
  { title: "Office for the Aging", slug: "office-for-the-aging", prompt: "What services does the NYS Office for the Aging provide to support older New Yorkers and their caregivers?" },
  { title: "Office for the Prevention of Domestic Violence", slug: "office-prevention-domestic-violence", prompt: "What does the Office for the Prevention of Domestic Violence do as the country's only executive-level state agency dedicated to this issue?" },
  { title: "Office of Addiction Services and Supports", slug: "office-of-addiction-services", prompt: "What does OASAS do to oversee prevention, treatment, and recovery programs for addiction services in New York?" },
  { title: "Office of Cannabis Management", slug: "office-of-cannabis-management", prompt: "What does the Office of Cannabis Management do to oversee the licensure, cultivation, and sale of cannabis in New York?" },
  { title: "Office of Children and Family Services", slug: "office-of-children-and-family-services", prompt: "What does OCFS do to promote the safety and well-being of children and families in New York?" },
  { title: "Office of Counter Terrorism", slug: "office-of-counter-terrorism", prompt: "What does the Office of Counter Terrorism do to work with law enforcement agencies in the fight against terrorism?" },
  { title: "Office of Emergency Management", slug: "office-of-emergency-management", prompt: "What does the Office of Emergency Management do to coordinate state agency activities and protect communities from disasters?" },
  { title: "Office of Employee Relations", slug: "office-of-employee-relations", prompt: "What does OER do to represent the Governor in negotiating collective bargaining agreements and administering workforce programs?" },
  { title: "Office of Fire Prevention and Control", slug: "office-of-fire-prevention-and-control", prompt: "What does OFPC do to advance public safety through firefighter training, fire prevention, and technical rescue programs?" },
  { title: "Office of Information Technology Services", slug: "office-of-information-technology-services", prompt: "What does ITS do to provide centralized IT services and set statewide technology policy for New York State?" },
  { title: "Office of Interoperable and Emergency Communications", slug: "office-of-emergency-communications", prompt: "What does OIEC do to direct interoperable and emergency communications including land and mobile radio systems?" },
  { title: "Office of Mental Health", slug: "office-of-mental-health", prompt: "What does the NYS Office of Mental Health do to promote mental health and facilitate recovery for New Yorkers?" },
  { title: "Office of Parks, Recreation and Historic Preservation", slug: "office-of-parks-recreation-and-historic-preservation", prompt: "What does the NYS Office of Parks, Recreation and Historic Preservation do to manage state parks and historic sites?" },
  { title: "Office of State Comptroller", slug: "office-of-state-comptroller", prompt: "What does the NYS Comptroller do to ensure state and local governments use taxpayer money effectively and efficiently?" },
  { title: "Office of Temporary and Disability Assistance", slug: "office-of-temporary-and-disability-assistance", prompt: "What does OTDA do to help vulnerable New Yorkers meet essential needs and advance economically?" },
  { title: "Office of the Governor", slug: "office-of-the-governor", prompt: "What is the role of the Office of the Governor in leading New York State's executive branch?" },
  { title: "Office of the Medicaid Inspector General", slug: "office-of-medicaid-inspector-general", prompt: "What does the Office of the Medicaid Inspector General do to prevent and detect fraud in the Medicaid program?" },
  { title: "Office of Victim Services", slug: "office-of-victim-services", prompt: "What does the Office of Victim Services do to provide a safety net for crime victims and fund direct services programs?" },
  { title: "Offices of the Inspector General", slug: "offices-of-the-inspector-general", prompt: "What do the Offices of the Inspector General do to ensure NYS government meets high standards of honesty and accountability?" },
  { title: "South Shore Estuary Council", slug: "south-shore-estuary-council", prompt: "What does the South Shore Estuary Council do to protect the long-term health of the Estuary on Long Island?" },
  { title: "State Board of Elections", slug: "state-board-of-elections", prompt: "What does the NYS State Board of Elections do to administer elections and enforce campaign finance laws?" },
  { title: "State Employees Federated Appeal (SEFA)", slug: "state-employees-federated-appeal", prompt: "What is SEFA and how does it enable New York State employees to contribute to charitable organizations through payroll deduction?" },
  { title: "Teachers' Retirement System", slug: "teachers-retirement-system", prompt: "What does the NYS Teachers' Retirement System do to administer retirement, disability, and death benefits for public school educators?" },
  { title: "Workers Compensation Board", slug: "workers-compensation-board", prompt: "What does the NYS Workers' Compensation Board do to protect the rights of employees and employers regarding workplace injuries?" },
];

// Authorities (sorted alphabetically)
export const authorityPrompts = [
  { title: "Battery Park City Authority", slug: "battery-park-city-authority", prompt: "What does the Battery Park City Authority manage in Lower Manhattan and what services does it provide?" },
  { title: "Buffalo and Fort Erie Public Bridge Authority", slug: "buffalo-and-fort-erie-public-bridge-authority", prompt: "What does the Buffalo and Fort Erie Public Bridge Authority manage at the Peace Bridge border crossing?" },
  { title: "City University of New York (CUNY)", slug: "city-university-of-new-york", prompt: "What does CUNY do to provide high-quality, accessible education for more than 269,000 students at 24 campuses in NYC?" },
  { title: "Dormitory Authority of the State of New York (DASNY)", slug: "dormitory-authority-dasny", prompt: "What does DASNY do to finance and construct public facilities including hospitals, universities, and courts?" },
  { title: "Empire State Development", slug: "empire-state-development", prompt: "What is Empire State Development and how does it promote economic growth and job creation in New York?" },
  { title: "Environmental Facilities Corporation", slug: "environmental-facilities-corporation", prompt: "What does the NYS Environmental Facilities Corporation do to finance water infrastructure and environmental projects?" },
  { title: "Financial Control Board", slug: "financial-control-board", prompt: "What does the NYS Financial Control Board do to oversee the financial management of New York City government?" },
  { title: "Higher Education Services Corporation", slug: "higher-education-services-corporation", prompt: "What does HESC do as New York State's student financial aid agency to help people pay for college?" },
  { title: "Hudson River Park Trust", slug: "hudson-river-park-trust", prompt: "What does the Hudson River Park Trust do to design, construct, and operate the 5-mile Hudson River Park in Manhattan?" },
  { title: "Jacob K. Javits Convention Center", slug: "javits-convention-center", prompt: "What is the Jacob K. Javits Convention Center and how does it serve as the busiest convention center in the United States?" },
  { title: "Long Island Power Authority", slug: "long-island-power-authority", prompt: "What does the Long Island Power Authority (LIPA) do to provide electric service to Long Island and the Rockaways?" },
  { title: "Long Island Rail Road Company", slug: "long-island-rail-road", prompt: "What services does the Long Island Rail Road provide and how does it serve commuters in the New York metropolitan area?" },
  { title: "Manhattan and Bronx Surface Transit Operating Authority", slug: "manhattan-bronx-surface-transit", prompt: "What does the Manhattan and Bronx Surface Transit Operating Authority manage regarding bus service in Manhattan and the Bronx?" },
  { title: "Metro-North Commuter Railroad Company", slug: "metro-north-commuter-railroad", prompt: "What services does Metro-North Railroad provide and what regions does it serve in the New York metropolitan area?" },
  { title: "Metropolitan Transportation Authority (MTA)", slug: "metropolitan-transportation-authority", prompt: "What is the MTA, how does it serve New York's public transportation needs, and what agencies fall under it?" },
  { title: "MTA Bridges and Tunnels", slug: "mta-bridges-and-tunnels", prompt: "What bridges and tunnels does MTA Bridges and Tunnels (Triborough Bridge and Tunnel Authority) operate in New York City?" },
  { title: "MTA Capital Construction Company", slug: "mta-capital-construction", prompt: "What does the MTA Capital Construction Company do to manage major infrastructure projects for New York's transit system?" },
  { title: "New York City Transit Authority", slug: "new-york-city-transit-authority", prompt: "What does the New York City Transit Authority manage regarding subway and bus service in New York City?" },
  { title: "New York Local Government Assistance Corporation", slug: "new-york-local-government-assistance-corporation", prompt: "What does the New York Local Government Assistance Corporation do to support local governments with financing?" },
  { title: "New York Power Authority", slug: "new-york-power-authority", prompt: "What is the New York Power Authority and how does it generate and distribute low-cost electricity across the state?" },
  { title: "New York Racing Association (NYRA)", slug: "new-york-racing-association", prompt: "What does the New York Racing Association do to manage thoroughbred horse racing at its three New York tracks?" },
  { title: "New York State Bridge Authority", slug: "nys-bridge-authority", prompt: "What bridges does the New York State Bridge Authority manage in the Hudson Valley region?" },
  { title: "New York State Canal Corporation", slug: "nys-canal-corporation", prompt: "What waterways and canal systems does the NYS Canal Corporation manage as a subsidiary of the Thruway Authority?" },
  { title: "New York State Energy Research and Development Authority (NYSERDA)", slug: "nyserda", prompt: "What is NYSERDA and how does it advance clean energy and sustainability in New York?" },
  { title: "New York State Homes and Community Renewal", slug: "nys-homes-and-community-renewal", prompt: "What does NYS Homes and Community Renewal do as the umbrella agency for affordable housing programs?" },
  { title: "New York State Housing Finance Agency", slug: "nys-housing-finance-agency", prompt: "What does the NYS Housing Finance Agency do to finance affordable housing development in New York?" },
  { title: "New York State Thruway Authority", slug: "nys-thruway-authority", prompt: "What does the NYS Thruway Authority manage and how does it maintain New York's highway and canal systems?" },
  { title: "NYC 311", slug: "nyc-311", prompt: "What is NYC 311 and how does it serve as New York City's main source of government information and non-emergency services?" },
  { title: "Olympic Regional Development Authority", slug: "olympic-regional-development-authority", prompt: "What does ORDA do to manage the 1980 Olympic facilities and operate Whiteface, Gore, and Belleayre ski areas?" },
  { title: "Port Authority of New York and New Jersey", slug: "port-authority-of-new-york-and-new-jersey", prompt: "What does the Port Authority do to build, operate, and maintain critical transportation and infrastructure assets in the region?" },
  { title: "Roosevelt Island Operating Corporation", slug: "roosevelt-island-operating-corporation", prompt: "What services does the Roosevelt Island Operating Corporation provide to residents of Roosevelt Island?" },
  { title: "Roswell Park Cancer Institute Corporation", slug: "roswell-park-cancer-institute", prompt: "What does the Roswell Park Cancer Institute Corporation do as a comprehensive cancer center in Buffalo, New York?" },
  { title: "State of New York Mortgage Agency (SONYMA)", slug: "state-of-new-york-mortgage-agency", prompt: "What does SONYMA do to help New Yorkers achieve homeownership through affordable mortgage programs?" },
  { title: "State University Construction Fund", slug: "state-university-construction-fund", prompt: "What does the State University Construction Fund do to construct academic buildings and facilities for SUNY institutions?" },
  { title: "State University of New York (SUNY)", slug: "state-university-of-new-york", prompt: "What is SUNY and how does it serve as the largest comprehensive university system in the United States with 64 campuses?" },
  { title: "Staten Island Rapid Transit Operating Authority", slug: "staten-island-rapid-transit", prompt: "What does the Staten Island Rapid Transit Operating Authority manage regarding rail service on Staten Island?" },
  { title: "United Nations Development Corporation", slug: "united-nations-development-corporation", prompt: "What does the United Nations Development Corporation do to support the United Nations headquarters area in New York City?" },
];

// Featured carousel items
const featuredItems = [
  {
    id: 'departments',
    title: 'Explore Departments',
    subtitle: 'Learn about state agencies',
    gradient: 'from-blue-400 to-cyan-300',
    darkGradient: 'dark:from-blue-600 dark:to-cyan-500',
    images: ['/nys-parks.webp', '/nysdot.jpeg'],
  },
  {
    id: 'agencies',
    title: 'Discover Agencies',
    subtitle: 'Specialized state services',
    gradient: 'from-purple-400 to-pink-300',
    darkGradient: 'dark:from-purple-600 dark:to-pink-500',
    images: ['/nyserda-3.jpg', '/mta.jpg'],
  },
  {
    id: 'authorities',
    title: 'Public Authorities',
    subtitle: 'Infrastructure & development',
    gradient: 'from-emerald-400 to-teal-300',
    darkGradient: 'dark:from-emerald-600 dark:to-teal-500',
    images: ['/port-authority.webp', '/nypa.jpg'],
  },
];

const filters = [
  { id: 'all', label: 'All' },
  { id: 'departments', label: 'Departments' },
  { id: 'agencies', label: 'Agencies' },
  { id: 'authorities', label: 'Authorities' },
];

const ITEMS_PER_PAGE = 24;

export default function Prompts() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Enable transition after initial mount
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);


  // Combine all prompts with category tags
  const allPrompts = [
    ...departmentPrompts.map(p => ({ ...p, category: 'departments' as const })),
    ...agencyPrompts.map(p => ({ ...p, category: 'agencies' as const })),
    ...authorityPrompts.map(p => ({ ...p, category: 'authorities' as const })),
  ];

  // Filter by category and search
  const filteredPrompts = allPrompts.filter((p) => {
    const matchesCategory = activeFilter === 'all' || p.category === activeFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || p.title.toLowerCase().includes(query) || p.prompt.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);
  const paginatedPrompts = filteredPrompts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePromptClick = (prompt: string) => {
    navigate(`/new-chat?prompt=${encodeURIComponent(prompt)}`);
  };

  const handleFeaturedClick = (item: typeof featuredItems[0]) => {
    setActiveFilter(item.id);
    setCurrentPage(1);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
  };

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Left Sidebar - slides in from off-screen */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-[60]",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>


      {/* Main Content Container */}
      <InsetPanel className="relative">
          {/* Header with sidebar toggle and model selector */}
          <div className="flex items-center justify-between px-4 py-3 bg-background flex-shrink-0">
            {/* Left side: Sidebar toggle */}
            <div className="flex items-center gap-2">
              <MobileMenuIcon onOpenSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)} />
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className={cn("hidden md:inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors", leftSidebarOpen && "bg-muted")}
                aria-label="Open menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
                  <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
                  <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
                </svg>
              </button>
            </div>
            {/* Right side: NYSgpt */}
            <button
              onClick={() => navigate('/?prompt=What%20is%20NYSgpt%3F')}
              className="inline-flex items-center justify-center h-10 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-xl"
            >
              NYSgpt
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="absolute top-[57px] bottom-0 left-0 right-0 overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-semibold">Departments</h1>
                  <p className="text-muted-foreground mt-1">
                    Start a conversation
                  </p>
                </div>
                <div className="relative w-64 hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search all"
                    className="pl-9 bg-muted/50 border-0"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>

              {/* Featured Carousel */}
              <div className="relative mb-8 overflow-hidden rounded-2xl">
                <div
                  ref={carouselRef}
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {featuredItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'min-w-full p-8 bg-gradient-to-br',
                        item.gradient,
                        item.darkGradient
                      )}
                    >
                      <div className="flex items-end justify-between min-h-[12rem]">
                        <div className="flex-1 flex flex-col justify-between self-stretch">
                          <div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                              {item.title}
                            </h2>
                            <p className="text-white/80">{item.subtitle}</p>
                          </div>
                          <Button
                            variant="secondary"
                            className="bg-white/90 hover:bg-white text-foreground w-fit"
                            onClick={() => handleFeaturedClick(item)}
                          >
                            View
                          </Button>
                        </div>
                        <div className="hidden md:block w-1/2">
                          <div className="flex gap-3 justify-end">
                            <>
                              <div className="w-40 h-48 rounded-xl overflow-hidden shadow-lg shadow-black/20">
                                {item.images[0] ? (
                                  <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-white/10 backdrop-blur" />
                                )}
                              </div>
                              <div className="w-40 h-48 rounded-xl overflow-hidden shadow-lg shadow-black/20 -mt-4">
                                {item.images[1] ? (
                                  <img src={item.images[1]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-white/10 backdrop-blur" />
                                )}
                              </div>
                            </>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Carousel Navigation */}
                <button
                  onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>

                {/* Carousel Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {featuredItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        currentSlide === idx ? 'bg-white' : 'bg-white/40'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Mobile Search */}
              <div className="relative mb-4 sm:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search all"
                  className="pl-9 bg-muted/50 border-0"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-8">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => { setActiveFilter(filter.id); setCurrentPage(1); }}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                      activeFilter === filter.id
                        ? 'bg-foreground text-background'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Prompts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {paginatedPrompts.map((item, idx) => (
                  <div
                    key={`${item.category}-${idx}`}
                    onClick={() => navigate(`/departments/${item.slug}`)}
                    className="group bg-muted/30 hover:bg-muted/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 text-left"
                  >
                    <h3 className="font-semibold text-base">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                      {item.prompt}
                    </p>

                    {/* Expand on hover - up-arrow to send prompt */}
                    <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-4 transition-all duration-200">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromptClick(item.prompt);
                          }}
                          className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                          title="Ask AI"
                        >
                          <ArrowUp className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredPrompts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found matching "{searchQuery}"
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8 pb-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 hover:bg-muted"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                        currentPage === page
                          ? 'bg-foreground text-background'
                          : 'hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 hover:bg-muted"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
      </InsetPanel>
    </div>
  );
}
