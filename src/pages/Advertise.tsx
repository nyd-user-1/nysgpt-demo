import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircle2Icon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NoteViewSidebar } from '@/components/NoteViewSidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export default function Advertise() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [company, setCompany] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [adOption, setAdOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Enable sidebar transitions after mount to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => setSidebarMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Dropdown options
  const industryOptions = ['Government', 'Lobbying', 'Non Profit', 'Legal', 'Construction', 'Media'];
  const companySizeOptions = ['1-25', '26-50', '51-100', '101-200', '201+'];


  // Pre-fill from logged in user
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      const meta = user.user_metadata;
      if (meta?.full_name) setName(meta.full_name);
      else if (meta?.name) setName(meta.name);
    }
  }, [user]);

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const interestOptions = [
    'Advocacy',
    'Appropriations',
    'Bills',
    'Budget',
    'Committees',
    'Contracts',
    'Lobbying',
    'Members',
    'News',
    'School Funding',
  ];

  const adOptions = [
    {
      id: 'hero-sponsor',
      title: 'Hero Sponsor',
      description: 'Premium placement in the main hero section. Maximum visibility with rotating featured content.',
      price: 'Premium',
    },
    {
      id: 'category-sponsor',
      title: 'Category Sponsor',
      description: 'Sponsored category card alongside Bill Research, Policy, Advocacy, and Departments.',
      price: null,
    },
    {
      id: 'prompt-page-sponsor',
      title: 'Prompt Page Sponsor',
      description: 'Your organization featured as sponsor above the community prompts section.',
      price: null,
    },
    {
      id: 'list-page-sponsor',
      title: 'List Page Sponsor',
      description: 'Your organization featured as sponsor at the top of the Lists page.',
      price: null,
    },
  ];

  // Validation for each step
  const isStep1Valid = name.trim() && email.trim();
  const isStep2Valid = industry && company.trim() && companySize;
  const isStep3Valid = interests.length > 0;

  const handleSubmit = async () => {
    // Split name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Get selected ad option title
    const selectedAdOption = adOptions.find(opt => opt.id === adOption);

    // HubSpot Forms API
    const portalId = '245035447';
    const formGuid = '536281ae-0a9b-4288-9e1f-07ef0f4b4463';

    try {
      const response = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: [
            { objectTypeId: '0-1', name: 'firstname', value: firstName },
            { objectTypeId: '0-1', name: 'lastname', value: lastName },
            { objectTypeId: '0-1', name: 'email', value: email },
            { objectTypeId: '0-1', name: 'company', value: company },
            { objectTypeId: '0-1', name: 'industry', value: industry },
            { objectTypeId: '0-1', name: 'company_size', value: companySize },
            { objectTypeId: '0-1', name: 'interests', value: interests.join(', ') },
            { objectTypeId: '0-1', name: 'ad_option', value: selectedAdOption?.title || '' },
            { objectTypeId: '0-2', name: 'name', value: company },
          ],
          context: {
            pageUri: window.location.href,
            pageName: 'Partner with NYSgpt',
          },
        }),
      });
      await response.json();
    } catch (error) {
      console.error('HubSpot submission error:', error);
    }

    setSubmitted(true);
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    // Second burst for more impact
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
    // Redirect to /prompts after delay
    setTimeout(() => {
      navigate('/prompts');
    }, 2000);
  };

  const handleNYSgptClick = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.9, y: 0.1 },
      colors: ['#ff6b6b', '#ff8e8e', '#ffb3b3', '#ffd4d4', '#3D63DD'],
    });
    navigate('/?prompt=What%20is%20NYSgpt%3F');
  };

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Left Sidebar - slides in from off-screen */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-50",
          sidebarMounted && "transition-transform duration-300 ease-in-out",
          leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NoteViewSidebar onClose={() => setLeftSidebarOpen(false)} />
      </div>

      {/* Backdrop overlay when sidebar is open */}
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* Logs icon - top left */}
      <button
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className="fixed top-2 left-3 z-30 inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
          <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
          <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
        </svg>
      </button>

      {/* NYSgpt button - top right */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleNYSgptClick}
            className="fixed top-2 right-3 z-30 inline-flex items-center justify-center h-10 rounded-md px-3 text-black hover:bg-muted transition-colors font-semibold text-xl"
          >
            NYSgpt
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-medium">
          What is NYSgpt?
        </TooltipContent>
      </Tooltip>

      {/* Hero */}
      <div className="bg-background relative grid min-h-[600px] overflow-hidden md:min-h-screen md:grid-cols-2">
        {/* Left Image */}
        <div className="relative hidden md:block">
          <img
            src="/images/advertise-hero.avif"
            alt="Team collaboration"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="bg-black/30 absolute inset-0 flex items-center justify-center p-10 backdrop-blur-sm">
            <div className="bg-background/80 max-w-md rounded-lg p-8 shadow-lg backdrop-blur-md">
              <h2 className="mb-4 text-2xl font-bold">
                Why NYSgpt?
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle2Icon className="text-foreground mt-0.5 mr-2 h-5 w-5 flex-shrink-0" />
                  <span>Conversational access to the full legislative corpus</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2Icon className="text-foreground mt-0.5 mr-2 h-5 w-5 flex-shrink-0" />
                  <span>Natural-language access to decades of public finance data</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2Icon className="text-foreground mt-0.5 mr-2 h-5 w-5 flex-shrink-0" />
                  <span>Direct interaction with primary budget documents</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2Icon className="text-foreground mt-0.5 mr-2 h-5 w-5 flex-shrink-0" />
                  <span>Embedded inside the government affairs workflow</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Form */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <h1 className="mb-2 scroll-m-20 text-3xl font-bold tracking-tight md:text-4xl">
              Partner with NYSgpt
            </h1>
            <p className="text-muted-foreground mb-8">
              Complete the steps below to get started.
            </p>

            {/* Step Counter */}
            <div className="mb-8 flex items-center">
              <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-black h-full transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                ></div>
              </div>
              <span className="ml-4 text-sm font-medium">
                Step {step} of {totalSteps}
              </span>
            </div>

            {/* Step 1 - Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="mb-4 text-xl font-semibold">
                  Basic Information
                </h2>
                <div>
                  <Label htmlFor="name" className="mb-2">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="mb-2">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="pt-4">
                  <Button
                    className="w-full bg-black hover:bg-black/90 text-white"
                    onClick={nextStep}
                    disabled={!isStep1Valid}
                  >
                    Continue <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 - Profile */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="mb-4 text-xl font-semibold">Profile Details</h2>
                <div>
                  <Label htmlFor="industry" className="mb-2">
                    Industry
                  </Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map((opt) => (
                        <SelectItem key={opt} value={opt} className="focus:bg-muted focus:text-foreground">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="company" className="mb-2">
                    Company
                  </Label>
                  <Input
                    id="company"
                    placeholder="Acme Inc."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="companySize" className="mb-2">
                    Company Size
                  </Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySizeOptions.map((opt) => (
                        <SelectItem key={opt} value={opt} className="focus:bg-muted focus:text-foreground">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="flex-1 bg-black hover:bg-black/90 text-white"
                    onClick={nextStep}
                    disabled={!isStep2Valid}
                  >
                    Continue <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 - Interests */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="mb-4 text-xl font-semibold">Interests</h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  Select the topics you're interested in:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {interestOptions.map((interest) => (
                    <div key={interest} className="flex items-center space-x-2">
                      <Checkbox
                        id={interest}
                        checked={interests.includes(interest)}
                        onCheckedChange={() => toggleInterest(interest)}
                        className="border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                      />
                      <Label htmlFor={interest} className="cursor-pointer">
                        {interest}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-8">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="flex-1 bg-black hover:bg-black/90 text-white"
                    onClick={nextStep}
                    disabled={!isStep3Valid}
                  >
                    Continue <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4 - Ad Options */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="mb-4 text-xl font-semibold">Choose an Ad Option</h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  Select the advertising placement that best fits your goals:
                </p>

                <div className="space-y-3">
                  {adOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAdOption(option.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        adOption === option.id
                          ? 'border-black bg-black/5 ring-1 ring-black'
                          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{option.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                        </div>
                        {option.price && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                            {option.price}
                          </span>
                        )}
                      </div>
                      {adOption === option.id && (
                        <div className="mt-2 flex items-center text-black text-xs">
                          <CheckCircle2Icon className="h-3.5 w-3.5 mr-1" />
                          Selected
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-8">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="flex-1 bg-black hover:bg-black/90 text-white"
                    disabled={!adOption || submitted}
                    onClick={handleSubmit}
                  >
                    {submitted ? (
                      <>
                        <CheckCircle2Icon className="mr-2 h-4 w-4" />
                        Inquiry received.
                      </>
                    ) : (
                      'Submit Inquiry'
                    )}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-muted-foreground mt-8 text-center text-xs">
              By submitting, you agree to our{' '}
              <a href="/terms" className="hover:text-foreground underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="hover:text-foreground underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
      {/* End Hero */}
    </div>
  );
}
