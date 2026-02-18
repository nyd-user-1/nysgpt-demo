import { Tables } from '@/integrations/supabase/types';

type Excerpt = Tables<'chat_excerpts'>;

// Editorial posts based on FY 2027 Executive Budget, Senate Blue Book, and Capital Budget analysis
export const EDITORIAL_POSTS: Excerpt[] = [
  {
    id: 'editorial-1',
    user_id: '',
    parent_session_id: null,
    title: 'FY 2027 Financial Plan: A $318.8 Billion Investment in New York\'s Future',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'Governor Hochul\'s FY 2027 Executive Budget proposes $318.8 billion in total appropriations, with General Fund spending growing 6.1% to $132.5 billion. Education leads with a $1.53 billion increase to $49.7 billion, while Children and Family Services sees a 16.7% boost. The budget preserves $14.6 billion in principal reserves and adds 441 new FTEs statewide \u2014 a disciplined approach to growth that prioritizes classrooms, child welfare, and fiscal stability.',
    created_at: '2026-02-16T10:00:00Z',
    updated_at: '2026-02-16T10:00:00Z',
  },
  {
    id: 'editorial-2',
    user_id: '',
    parent_session_id: null,
    title: 'The Hidden Risks in the FY 2027 Financial Plan',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'Behind the topline numbers of the $318.8 billion FY 2027 budget lie structural concerns. The 0.9% overall decline masks a $8.3 billion drop at the Department of Labor as pandemic-era federal funds expire \u2014 a cliff that could strain unemployment services. Aid to Localities, which makes up 75% of spending, actually decreases 1.7%. And with $312.9 billion in reappropriations carried forward (nearly matching the entire budget), the state is deferring an enormous backlog of unfunded commitments.',
    created_at: '2026-02-16T08:00:00Z',
    updated_at: '2026-02-16T08:00:00Z',
  },
  {
    id: 'editorial-3',
    user_id: '',
    parent_session_id: null,
    title: 'Blue Book Analysis: Senate Majority Highlights Smart Investments in Education and Health',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'The Senate Majority\'s Blue Book staff analysis underscores the FY 2027 budget\'s commitment to core services. Education receives the single largest dollar increase at $1.53 billion, bringing the State Education Department to $49.7 billion. The Department of Health, at $135.1 billion, accounts for 42% of all state spending. General State Charges grow $915 million to cover pension and employee benefit obligations \u2014 keeping the state\'s promises to its workforce while investing in the services New Yorkers depend on.',
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'editorial-4',
    user_id: '',
    parent_session_id: null,
    title: 'Blue Book Analysis: What the Senate Majority Staff Flagged as Concerns',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'The Senate Majority\'s Blue Book raises pointed questions about the Executive Budget\'s long-term sustainability. The Department of Labor\'s 54% funding drop ($8.3 billion) signals a post-pandemic fiscal cliff. Enterprise fund spending plunges 46.3%. Meanwhile, agencies like the Council on Developmental Disabilities (+55.9%) and Deferred Compensation Board (+39.0%) see outsized percentage growth with limited public explanation. The Blue Book analysis also notes that $201 billion in Health Department reappropriations represent an unprecedented level of deferred spending authority that warrants closer legislative scrutiny.',
    created_at: '2026-02-15T08:00:00Z',
    updated_at: '2026-02-15T08:00:00Z',
  },
  {
    id: 'editorial-5',
    user_id: '',
    parent_session_id: null,
    title: 'Where the Money Goes: Breaking Down $318.8 Billion Across 101 Agencies',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'New York\'s FY 2027 budget spans 101 agencies, but spending is remarkably concentrated. The Department of Health ($135.1B), Education ($49.7B), and SUNY ($13.4B) together account for over 62% of all appropriations. Aid to Localities at $239 billion dwarfs State Operations at $69.1 billion and Debt Service at $10.6 billion. A deeper look at the appropriations data reveals how Albany allocates resources \u2014 and where smaller agencies like Agriculture (+$22M, +11.2%) and Mental Health (+$344M, +5.7%) are getting meaningful new investment.',
    created_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-02-14T10:00:00Z',
  },
  {
    id: 'editorial-6',
    user_id: '',
    parent_session_id: null,
    title: 'The Post-Pandemic Fiscal Cliff: What the Labor Department\'s $8.3 Billion Cut Means',
    user_message: '',
    assistant_message: '',
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'The single largest line-item change in the FY 2027 budget is the Department of Labor\'s $8.3 billion reduction \u2014 a 54% cut that accounts for nearly all of the budget\'s overall decline. This drop reflects the expiration of federal pandemic-era unemployment insurance funds, not a policy decision to slash services. But the impact is real: as enhanced federal support disappears, New York must absorb workforce development costs with state dollars or accept diminished capacity. The question for legislators is whether the Executive Budget adequately bridges this gap or simply lets it widen.',
    created_at: '2026-02-14T08:00:00Z',
    updated_at: '2026-02-14T08:00:00Z',
  },
  {
    id: 'editorial-7',
    user_id: '',
    parent_session_id: null,
    title: 'Capital Budget Deep Dive: $19.9 Billion in New Investment Targets Roads, Environment, and Health',
    user_message: '',
    assistant_message: `Governor Hochul's FY 2027 Executive Budget proposes $19.9 billion in new capital appropriations spread across 63 state agencies and 197 distinct programs. This is the state's blueprint for physical investment \u2014 the roads, bridges, hospitals, university buildings, parks, and environmental systems that define New York's infrastructure for decades to come.

The numbers tell a clear story: Albany is concentrating its capital dollars where the physical need is greatest, while preserving flexibility to seed new programs at the margins.

## Transportation Leads with $7.4 Billion

The Department of Transportation commands the single largest share of the capital budget at $7.4 billion \u2014 37% of all new appropriations. Highway facilities alone account for $5.9 billion, reflecting the ongoing cost of maintaining and modernizing the state's 114,000-lane-mile highway system. Mass transportation and rail freight receive an additional $484 million.

This isn't discretionary spending. Federal highway formulas and match requirements drive much of the DOT capital program, and the state's bridges and roads face a well-documented maintenance backlog. The $7.4 billion allocation signals that Albany is meeting its federal obligations and keeping pace with deterioration \u2014 even if it falls short of the full modernization agenda that transportation advocates have called for.

## Environmental Protection Gets a Major Commitment

The Department of Environmental Conservation receives $3.0 billion in new capital \u2014 14.9% of the total and the second-largest agency allocation. This funds a portfolio that spans clean water infrastructure, hazardous waste remediation, environmental protection, and land conservation.

The financing mix tells an important sub-story: $1.4 billion flows through DEC-specific authority bonds, $425 million comes from the Environmental Protection Fund, $125 million targets the Hazardous Waste Remedial Fund, and $89 million supports the State Revolving Fund for water infrastructure. Parks, Recreation, and Historic Preservation adds another $589 million, bringing the broader environmental and conservation commitment above $3.5 billion.

## Health, Higher Education, and Corrections

The Department of Health receives $1.4 billion in new capital (7.1%), largely directed toward health care system improvement and facility preservation. SUNY follows at $1.2 billion (6.2%), funding campus infrastructure across the university system, including $100 million for residence hall rehabilitation.

Empire State Development \u2014 the state's economic development arm \u2014 receives $1.2 billion (5.9%), while the Department of Corrections and Community Supervision gets $603 million (3.0%) for facility upgrades across the state prison system. CUNY receives $421 million.

## Where the Money Flows by Purpose

Breaking down the $19.9 billion by state purpose reveals the priorities driving capital investment:

- **Highway Facilities**: $5.9 billion (29.7%)
- **Preservation of Facilities**: $3.9 billion (19.7%)
- **Environmental Protection**: $2.8 billion (14.2%)
- **Economic Development**: $1.4 billion (6.9%)
- **Infrastructure**: $1.1 billion (5.6%)
- **New Facilities**: $1.1 billion (5.3%)
- **Health Care System Improvement**: $1.0 billion (5.1%)
- **Health and Safety**: $868 million (4.4%)

Nearly half the capital budget \u2014 49.4% \u2014 goes to just two categories: highways and preserving existing state buildings. This is a maintenance-first budget, not a moonshot.

## How It's Financed

Authority bonds remain the dominant financing mechanism, with Capital Projects Fund authority bonds accounting for $6.3 billion (31.7%) of new appropriations. Federal capital funds contribute $4.4 billion (21.9%), underscoring how much of the state's capital program depends on Washington. The Dedicated Highway and Bridge Trust Fund provides $2.4 billion (12.0%), and the state's own Capital Projects Fund adds $1.7 billion (8.4%).

Smaller dedicated funds round out the picture: the Housing Program Fund ($859 million), Correctional Facilities Capital Improvement Fund ($603 million), Mental Hygiene Facilities Capital Improvement ($457 million), and the Environmental Protection Fund ($425 million).

## New Programs Signal Forward-Looking Investment

Two agencies appear in the capital budget for the first time with no prior-year reappropriations \u2014 a signal of genuinely new capital programs:

- **Alcoholic Beverage Control**: $17 million, likely funding modernization of licensing and enforcement systems
- **Inflation Reduction Act Elective Pay Program**: $10 million, positioning the state to capture federal clean energy tax credits through the IRA's elective pay provisions

These are small line items in a $19.9 billion budget, but they represent the kind of forward-looking capital investment that can catalyze larger returns \u2014 particularly the IRA program, which could unlock significant federal clean energy funding for state facilities.

## Concentration Is a Feature, Not a Bug

The top five agencies control 71.2% of new capital appropriations. The top ten control 85.3%. Critics might call this concentration, but in capital budgeting, it reflects a basic reality: infrastructure is expensive, and the state's biggest physical systems \u2014 highways, water treatment, university campuses, hospitals \u2014 require the biggest checks.

The FY 2027 capital budget won't satisfy everyone. Transit advocates will note the MTA's modest $75 million in new appropriations. Housing advocates will question whether $708 million moves the needle on the state's affordability crisis. But as a statement of physical priorities, the budget is coherent: maintain what we have, protect the environment, and keep the state's core systems \u2014 roads, schools, hospitals \u2014 functional for the next generation of New Yorkers.`,
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'The FY 2027 capital budget directs $19.9 billion in new appropriations across 63 agencies and 197 programs \u2014 a focused bet on infrastructure, environmental protection, and public health. Transportation commands the largest share at $7.4 billion (37%), followed by Environmental Conservation at $3.0 billion (15%) and Health at $1.4 billion (7%).',
    created_at: '2026-02-13T10:00:00Z',
    updated_at: '2026-02-13T10:00:00Z',
  },
  {
    id: 'editorial-8',
    user_id: '',
    parent_session_id: null,
    title: 'The $126.9 Billion Question: New York\u2019s Capital Reappropriation Backlog Demands Scrutiny',
    user_message: '',
    assistant_message: `For every dollar New York proposes in new capital spending in FY 2027, it carries forward $6.40 in unspent reappropriations from prior years. That ratio \u2014 $126.9 billion in legacy spending authority against $19.9 billion in new appropriations \u2014 is the single most important number in the state's capital budget, and the one Albany least wants to talk about.

## What Reappropriations Actually Are

When the Legislature authorizes capital spending but the money isn't spent within the fiscal year, the unspent authority "reappropriates" \u2014 it rolls forward into the next budget as continued authorization to spend. In theory, this is routine bookkeeping for multi-year construction projects. In practice, New York's reappropriation balance has grown into something far more troubling: a $126.9 billion reservoir of spending promises the state has made but not kept.

To put that figure in perspective: the state's entire new capital budget is $19.9 billion. The reappropriation backlog is 6.4 times larger. It would take more than six years of new capital investment \u2014 at current levels, with zero new reappropriations \u2014 just to work through the existing queue.

## The Encumbrance Gap

Of the $126.9 billion in reappropriations, only $17.2 billion \u2014 13.5% \u2014 is encumbered, meaning there's an actual contract or legal commitment behind the spending authority. The remaining $109.7 billion is unencumbered: authorized on paper, with no contractor hired, no project underway, and no binding obligation to spend.

This encumbrance rate varies dramatically by agency. The Office of General Services has committed 31% of its reappropriations. Military and Naval Affairs: 32%. SUNY: 27%. But the Department of Health \u2014 carrying $7.3 billion in reappropriations \u2014 has encumbered only 9%. The Office of Mental Health, with $4.2 billion in legacy authority, shows just 6%.

These low encumbrance rates suggest that billions in capital authority exist as legislative artifacts rather than active construction programs.

## The Worst Ratios in the Budget

Some agencies carry reappropriation-to-new-appropriation ratios that strain credibility:

- **Metropolitan Transportation Authority**: $5.8 billion in reappropriations vs. $75 million in new funding \u2014 a **77:1 ratio**. The state has authorized nearly $6 billion in MTA capital spending over prior years that remains unspent, while adding a token $75 million this cycle.

- **State Education Department**: $2.5 billion in reappropriations vs. $194 million new \u2014 **12.8:1**. Capital projects for schools and libraries authorized years ago remain unfunded.

- **City University of New York**: $4.5 billion in reappropriations vs. $421 million new \u2014 **10.7:1**. CUNY's campus infrastructure needs have been acknowledged in budget after budget, yet the backlog grows.

- **Housing and Community Renewal**: $7.2 billion in reappropriations vs. $708 million new \u2014 **10.2:1**. In the middle of a housing affordability crisis, the state carries $7.2 billion in unspent housing capital authority.

- **Empire State Development**: $11.0 billion in reappropriations vs. $1.2 billion new \u2014 **9.3:1**. The state's economic development arm has accumulated $11 billion in capital authority it hasn't deployed.

- **Mental Health**: $4.2 billion in reappropriations vs. $445 million new \u2014 **9.5:1**. At a time when the state's mental health infrastructure is widely acknowledged as inadequate, billions in authorized capital improvements sit idle.

## Agencies Running on Autopilot

Perhaps more revealing are the agencies carrying large reappropriation balances with zero new capital investment \u2014 programs where the state has effectively stopped adding new money but continues to carry forward old authorizations:

- **Special Infrastructure Account**: $1.9 billion in reappropriations, $0 new
- **State and Municipal Facilities Program**: $1.6 billion in reappropriations, $0 new
- **Community Resiliency, Economic Sustainability and Technology**: $1.5 billion in reappropriations, $0 new
- **Sustainable Future Program**: $1.0 billion in reappropriations, $0 new
- **Jacob Javits Convention Center**: $350 million in reappropriations, $0 new

These are not small numbers. The Special Infrastructure Account alone carries nearly $1.9 billion in unspent authority \u2014 more than the entire new capital allocation for SUNY, CUNY, Housing, and Mental Health combined.

## The Transportation Backlog

Even the Department of Transportation \u2014 the budget's largest and arguably most credible capital program \u2014 carries a $35.7 billion reappropriation balance against $7.4 billion in new funding (4.8:1). Its 23% encumbrance rate means $27.4 billion in DOT capital authority has no contract behind it.

Environmental Conservation is similar: $20.4 billion in reappropriations, $3.0 billion new (6.9:1), with a 19% encumbrance rate. That's $16.5 billion in authorized environmental spending that exists only on paper.

## What This Means for Accountability

The capital reappropriation backlog creates three problems that the Legislature should take seriously:

**First, it inflates the state's apparent commitment to investment.** When the Governor announces a multi-billion-dollar capital program, the headline number includes reappropriations. But if 86.5% of carried-forward authority is unencumbered, the actual spending pipeline is a fraction of what's advertised.

**Second, it obscures prioritization.** With $126.9 billion in legacy authority spread across dozens of agencies, it becomes difficult to distinguish between active capital programs and zombie authorizations that will never result in construction. The budget process should force agencies to justify continued reappropriations, not rubber-stamp them.

**Third, it undermines fiscal transparency.** Capital spending authority that rolls forward indefinitely, without expiration or mandatory review, creates a phantom balance sheet. New York appears to have a $147 billion capital program ($19.9B new + $126.9B reappropriated). In reality, it has a $19.9 billion capital program and $126.9 billion in IOUs to itself.

## The Path Forward

The fix isn't complicated. Other states impose sunset provisions on capital reappropriations \u2014 typically three to five years \u2014 after which unencumbered authority expires and must be re-authorized. New York could adopt similar discipline without disrupting legitimate multi-year projects.

The Legislature could also require agencies to report encumbrance rates alongside reappropriation requests, giving lawmakers a clear signal of which programs are active and which are dormant. A capital authority with a 6% encumbrance rate after multiple fiscal years is not a construction program \u2014 it's a line item waiting to be cleaned up.

Until Albany addresses the reappropriation backlog, the state's capital budget will remain part investment plan and part fiction \u2014 a document that promises far more than it delivers, year after year, without consequence.`,
    bill_id: null,
    member_id: null,
    committee_id: null,
    is_published: true,
    messages: null,
    description: 'For every dollar New York proposes in new capital spending, it carries forward $6.40 in unspent reappropriations from prior years \u2014 a staggering $126.9 billion backlog against just $19.9 billion in new appropriations. Only 13.5% is encumbered, meaning $109.7 billion sits as unused spending authority with no contract behind it.',
    created_at: '2026-02-13T08:00:00Z',
    updated_at: '2026-02-13T08:00:00Z',
  },
];

export function findEditorialPost(id: string): Excerpt | undefined {
  return EDITORIAL_POSTS.find((p) => p.id === id);
}
