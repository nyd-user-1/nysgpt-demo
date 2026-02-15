import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, Upload, Brain, ChevronDown, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DocumentUploadModal } from './DocumentUploadModal';
import { 
  getDomainFilter, 
  getSourceCredibilityBadge, 
  validateSourceMix, 
  filterUrlsByDomain,
  LEGISLATIVE_SOURCES,
  POLICY_RESEARCH_SOURCES
} from '@/config/domainFilters';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'bill' | 'member' | 'committee' | 'policy';
  metadata?: {
    billNumber?: string;
    sponsor?: string;
    status?: string;
    committee?: string;
    party?: string;
    role?: string;
    district?: string;
    chamber?: string;
    description?: string;
    chair?: string;
    memberCount?: string;
    activeBills?: string;
  };
}

interface SourceOption {
  id: string;
  label: string;
  enabled: boolean;
  count?: number;
  allowedDomains?: string[];
  credibilityTier?: number;
  category?: string;
  requiresMultiSource?: boolean;
}

interface AdvancedSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
}

export const AdvancedSearchCombobox: React.FC<AdvancedSearchComboboxProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask anything about legislation, policies, or lawmakers...",
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bills' | 'sources'>('sources');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sources, setSources] = useState<SourceOption[]>([
    { 
      id: 'nys-bills', 
      label: 'NYS Bills & Resolutions (18K+)', 
      enabled: true, 
      count: 4,
      allowedDomains: ['nysgpt.com', 'nysenate.gov', 'assembly.state.ny.us'],
      credibilityTier: 1,
      category: 'Legislative',
      requiresMultiSource: true
    },
    { 
      id: 'legislators', 
      label: 'NYS Legislators & Members (200+)', 
      enabled: true,
      allowedDomains: ['nysgpt.com', 'nysenate.gov', 'assembly.state.ny.us'],
      credibilityTier: 1,
      category: 'Legislative'
    },
    { 
      id: 'committee-reports', 
      label: 'Committee Reports & Data (80+)', 
      enabled: true,
      allowedDomains: getDomainFilter(),
      credibilityTier: 1,
      category: 'Legislative'
    },
    { 
      id: 'policy-research', 
      label: 'Policy Research & Analysis', 
      enabled: true,
      allowedDomains: POLICY_RESEARCH_SOURCES.map(s => s.domain),
      credibilityTier: 1,
      category: 'Research'
    }
  ]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const comboboxId = useRef(`search-combobox-${Math.random().toString(36).substr(2, 9)}`);
  const listboxId = useRef(`search-listbox-${Math.random().toString(36).substr(2, 9)}`);

  const hasContent = value.trim().length > 0;
  const enabledSourcesCount = sources.filter(s => s.enabled).length;

  // Fetch search suggestions based on active tab
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Show trending/recent items when no query
      await fetchTrendingSuggestions();
      return;
    }

    setLoading(true);
    try {
      let data = [];
      
      switch (activeTab) {
        case 'bills':
          const { data: billsData } = await supabase
            .from('Bills')
            .select('bill_id, bill_number, title, sponsor')
            .ilike('title', `%${query}%`)
            .limit(10);
          
          data = (billsData || []).map((bill, index) => ({
            id: `bill-${bill.bill_id}`,
            text: bill.title,
            type: 'bill' as const,
            metadata: {
              billNumber: bill.bill_number,
              sponsor: bill.sponsor
            }
          }));
          break;
          
          
        case 'sources':
          // Comprehensive search across all enabled sources
          const promises = [];
          
          // Bills search (18,000+ bills)
          if (sources.find(s => s.id === 'nys-bills')?.enabled) {
            promises.push(
              supabase
                .from('Bills')
                .select('bill_id, bill_number, title, sponsor, status_desc, committee')
                .or(`title.ilike.%${query}%, bill_number.ilike.%${query}%, sponsor.ilike.%${query}%, description.ilike.%${query}%`)
                .limit(6)
            );
          }
          
          // Members/Legislators search (200+ members)
          promises.push(
            supabase
              .from('People')
              .select('people_id, name, first_name, last_name, party, role, district, chamber')
              .or(`name.ilike.%${query}%, first_name.ilike.%${query}%, last_name.ilike.%${query}%, role.ilike.%${query}%`)
              .eq('archived', false)
              .limit(4)
          );
          
          // Committees search (80+ committees)  
          if (sources.find(s => s.id === 'committee-reports')?.enabled) {
            promises.push(
              supabase
                .from('Committees')
                .select('committee_id, committee_name, chamber, description, chair_name, member_count, active_bills_count, committee_members')
                .or(`committee_name.ilike.%${query}%, description.ilike.%${query}%, chair_name.ilike.%${query}%`)
                .limit(4)
            );
          }
          
          const results = await Promise.all(promises);
          
          data = [
            // Bills results
            ...(results[0]?.data || []).map((bill: any) => ({
              id: `bill-${bill.bill_id}`,
              text: bill.title,
              type: 'bill' as const,
              metadata: { 
                billNumber: bill.bill_number, 
                sponsor: bill.sponsor,
                status: bill.status_desc,
                committee: bill.committee
              }
            })),
            // Members results
            ...(results[1]?.data || []).map((member: any) => ({
              id: `member-${member.people_id}`,
              text: member.name,
              type: 'member' as const,
              metadata: { 
                party: member.party,
                role: member.role,
                district: member.district,
                chamber: member.chamber
              }
            })),
            // Committees results
            ...(results[2]?.data || []).map((committee: any) => ({
              id: `committee-${committee.committee_id}`,
              text: committee.committee_name,
              type: 'committee' as const,
              metadata: { 
                description: committee.description,
                chair: committee.chair_name,
                chamber: committee.chamber,
                memberCount: committee.committee_members
                  ? String(committee.committee_members.split(';').filter((s: string) => s.trim()).length)
                  : committee.member_count,
                activeBills: committee.active_bills_count
              }
            }))
          ];
          break;
      }
      
      setSuggestions(data);
    } catch (error) {
      // Error fetching suggestions - will show empty state
    } finally {
      setLoading(false);
    }
  }, [activeTab, sources]);

  const fetchTrendingSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch of trending content across all data types
      const [billsResult, membersResult, committeesResult] = await Promise.all([
        // Recent active bills
        supabase
          .from('Bills')
          .select('bill_id, bill_number, title, sponsor, status_desc')
          .order('last_action_date', { ascending: false })
          .limit(5),
        
        // Active legislators  
        supabase
          .from('People')
          .select('people_id, name, party, role, chamber')
          .eq('archived', false)
          .limit(4),
          
        // Active committees
        supabase
          .from('Committees')
          .select('committee_id, committee_name, chair_name, active_bills_count')
          .order('active_bills_count', { ascending: false })
          .limit(3)
      ]);
      
      const trendingQueries = [
        'Healthcare reform legislation',
        'Education budget allocation',
        'Climate policy updates',
        'Criminal justice reform'
      ];
      
      const suggestions = [
        // Recent bills
        ...(billsResult.data || []).map((bill: any) => ({
          id: `trending-bill-${bill.bill_id}`,
          text: bill.title,
          type: 'bill' as const,
          metadata: {
            billNumber: bill.bill_number,
            sponsor: bill.sponsor,
            status: bill.status_desc
          }
        })),
        // Key legislators
        ...(membersResult.data || []).map((member: any) => ({
          id: `trending-member-${member.people_id}`,
          text: member.name,
          type: 'member' as const,
          metadata: {
            party: member.party,
            role: member.role,
            chamber: member.chamber
          }
        })),
        // Active committees
        ...(committeesResult.data || []).map((committee: any) => ({
          id: `trending-committee-${committee.committee_id}`,
          text: committee.committee_name,
          type: 'committee' as const,
          metadata: {
            chair: committee.chair_name,
            activeBills: committee.active_bills_count
          }
        })),
        // Trending policy queries
        ...trendingQueries.map((query, index) => ({
          id: `trending-policy-${index}`,
          text: query,
          type: 'policy' as const
        }))
      ];
      
      setSuggestions(suggestions.slice(0, 15));
    } catch (error) {
      // Error fetching trending suggestions - show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [value, isOpen, fetchSuggestions]);

  const handleInputFocus = () => {
    setIsOpen(true);
    setSelectedIndex(-1);
    if (suggestions.length === 0) {
      fetchTrendingSuggestions();
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as Node;
    if (listboxRef.current?.contains(relatedTarget)) {
      return;
    }
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
      setSourcesOpen(false);
    }, 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const newValue = suggestion.metadata?.billNumber 
      ? `${suggestion.metadata.billNumber}: ${suggestion.text}`
      : suggestion.text;
    onChange(newValue);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSourceToggle = (sourceId: string) => {
    setSources(prev => prev.map(source => 
      source.id === sourceId 
        ? { ...source, enabled: !source.enabled }
        : source
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setSelectedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        setSourcesOpen(false);
        inputRef.current?.focus();
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev < suggestions.length - 1 ? prev + 1 : 0;
          setTimeout(() => {
            const selectedElement = document.getElementById(`${listboxId.current}-option-${newIndex}`);
            selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
          return newIndex;
        });
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : suggestions.length - 1;
          setTimeout(() => {
            const selectedElement = document.getElementById(`${listboxId.current}-option-${newIndex}`);
            selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
          return newIndex;
        });
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (hasContent) {
          onSubmit();
        }
        break;
      
      case 'Tab':
        setIsOpen(false);
        setSelectedIndex(-1);
        setSourcesOpen(false);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasContent) {
      // Close any open dropdowns
      setIsOpen(false);
      setSourcesOpen(false);
      setSelectedIndex(-1);
      onSubmit();
    }
  };

  return (
    <div className={`relative w-full ${className}`} style={{ zIndex: 40 }}>
      <div className="advanced-search-wrapper relative">
        <form onSubmit={handleSubmit}>
          {/* Main search container - Fintool replica */}
          <div 
            className={`relative bg-card border transition-all duration-300 shadow-lg ${
              isOpen 
                ? 'rounded-t-2xl border-b-0 border-primary/50' 
                : 'rounded-2xl border-border'
            } focus-within:border-primary/50`}
          >
            {/* Search input section */}
            <div className="p-6">
              <div className="relative">
                <Input
                  ref={inputRef}
                  id={comboboxId.current}
                  type="text"
                  value={value}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="h-14 pr-20 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground text-foreground text-lg font-medium"
                  role="combobox"
                  aria-expanded={isOpen}
                  aria-autocomplete="list"
                  aria-controls={isOpen ? listboxId.current : undefined}
                  aria-activedescendant={
                    selectedIndex >= 0 ? `${listboxId.current}-option-${selectedIndex}` : undefined
                  }
                />
                
                {/* Submit button only */}
                {hasContent && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Button
                      type="submit"
                      variant="default"
                      size="sm"
                      className="h-8 px-3"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Think
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Button section */}
            <div className="px-6 pb-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={activeTab === "bills" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("bills")}
                  className="h-8"
                >
                  Bills
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "sources" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("sources")}
                  className="flex items-center gap-2 h-8"
                >
                  Sources
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {enabledSourcesCount}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourcesOpen(!sourcesOpen);
                    }}
                    className="h-auto p-0 ml-1"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadModalOpen(true)}
                  className="h-8 px-3"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Sources dropdown - positioned relative to Sources tab */}
        {sourcesOpen && activeTab === 'sources' && (
          <div className="absolute left-64 top-full mt-2 w-96 bg-card border border-border rounded-lg shadow-xl z-50 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Select Sources</h4>
              </div>
              {sources.map((source) => (
                <div key={source.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={source.id}
                        checked={source.enabled}
                        onChange={() => handleSourceToggle(source.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div className="flex flex-col">
                        <label htmlFor={source.id} className="text-sm text-foreground cursor-pointer font-medium">
                          {source.label}
                        </label>
                        <div className="mt-1">
                          <span className="text-xs text-muted-foreground">
                            {source.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 mt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  All sources are pre-filtered for credibility. NYSgpt data requires external validation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search suggestions dropdown */}
        {isOpen && !sourcesOpen && (
          <div className="absolute left-0 right-0 top-full bg-card border border-primary/50 border-t-0 rounded-b-2xl shadow-xl z-50 max-h-[360px] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {value.trim() ? 'Search Results' : activeTab === 'bills' ? 'Recent Bills' : 'Legislative Intelligence'}
                </h4>
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified Sources
                </Badge>
              </div>
            </div>
            
            {loading ? (
              <div className="px-6 py-8">
                <span className="text-sm text-muted-foreground">
                  Searching legislative data...
                </span>
              </div>
            ) : suggestions.length > 0 ? (
              <ul
                ref={listboxRef}
                id={listboxId.current}
                role="listbox"
                aria-label="Search suggestions"
                className="py-2"
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    id={`${listboxId.current}-option-${index}`}
                    role="option"
                    aria-selected={selectedIndex === index}
                    className={`px-6 py-3 cursor-pointer transition-colors ${
                      selectedIndex === index
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground line-clamp-2">
                          {suggestion.text}
                        </div>
                        {suggestion.metadata && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* Bill metadata */}
                            {suggestion.metadata.billNumber && (
                              <Badge variant="outline" className="text-xs">
                                {suggestion.metadata.billNumber}
                              </Badge>
                            )}
                            {suggestion.metadata.sponsor && (
                              <span className="text-xs text-muted-foreground">
                                Sponsor: {suggestion.metadata.sponsor}
                              </span>
                            )}
                            {suggestion.metadata.status && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.metadata.status}
                              </Badge>
                            )}
                            
                            {/* Member metadata */}
                            {suggestion.metadata.party && (
                              <Badge variant="outline" className="text-xs">
                                {suggestion.metadata.party}
                              </Badge>
                            )}
                            {suggestion.metadata.role && (
                              <span className="text-xs text-muted-foreground">
                                {suggestion.metadata.role}
                              </span>
                            )}
                            {suggestion.metadata.district && (
                              <span className="text-xs text-muted-foreground">
                                District {suggestion.metadata.district}
                              </span>
                            )}
                            {suggestion.metadata.chamber && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.metadata.chamber}
                              </Badge>
                            )}
                            
                            {/* Committee metadata */}
                            {suggestion.metadata.chair && (
                              <span className="text-xs text-muted-foreground">
                                Chair: {suggestion.metadata.chair}
                              </span>
                            )}
                            {suggestion.metadata.activeBills && (
                              <Badge variant="outline" className="text-xs">
                                {suggestion.metadata.activeBills} bills
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2 text-xs capitalize">
                        {suggestion.type}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8">
                <span className="text-sm text-muted-foreground">
                  No results found. Try different search terms.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Document Upload Modal */}
        <DocumentUploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
        />
      </div>
    </div>
  );
};