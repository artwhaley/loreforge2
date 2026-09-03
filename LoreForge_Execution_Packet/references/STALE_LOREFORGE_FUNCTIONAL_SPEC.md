# LoreForge — Functional Specification

## What Is LoreForge?

LoreForge is an online archive and record-keeping platform built for 
roleplay communities, primarily those operating inside the virtual world 
Second Life. These communities maintain ongoing fictional settings — 
cities, kingdoms, space stations, hospitals, police departments — and 
need a way to keep official records of events that happen within those 
settings: marriages, contracts, property ownership, legal hearings, 
incident reports, and more.

Today most of these communities manage their records in folders of plain 
text files, which becomes unmanageable as communities grow. LoreForge 
gives them a proper archive: searchable, organized, permissioned, and 
skinnable to match the look and feel of their fictional world.

Think of it as the software a courthouse clerk or city records office 
would use — but for collaborative fiction.

---

## Who Uses It

**Community members (players)** use LoreForge to file, read, and 
reference records relevant to their characters and storylines. A player 
might look up a property deed their character owns, file an incident 
report after an in-game event, or reference a contract signed between 
two factions.

**Scribes, clerks, and record-keepers** are players whose roleplay role 
is specifically to maintain the archive. They file the majority of 
documents and may have elevated permissions to organize and manage 
records.

**Domain administrators** are typically the game masters or community 
organizers behind the roleplay setting. They configure the system for 
their community: setting up document types, managing who has what access, 
and maintaining the overall archive.

**The platform owner (LoreForge)** manages the overall system, handles 
subscriptions, and has administrative visibility across all communities 
on the platform.

---

## Core Concepts

### Domains

A **domain** is the top-level container for a community's archive.  These
are the tenants in a traditional tenant-based cms, which Loreforge shares 
some similarity with.

Each community that subscribes to LoreForge gets their own domain. 
A domain has:

- A name and a web address (URL) that the community uses to access it
- Its own visual appearance (colors, fonts, logo) that can be customized 
  to match the community's aesthetic - we want to implement both an easy to use
  WYSIWYG live editor, and direct .css editing for advanced users.
- Its own set of document types, templates, and organizational structure
- Its own user roster with individually configured access levels
- A subscription status and details - the communities are paying tenants and 
we need all the standard features to track and manage subscriptions and graceful
startup and shutdown of a domain when a community is finished with it.

Domains are truly 'owned' in a permissions sense by the administrator of LoreForge,
not by any individual user.  Each domain will have one or more nominal 'owners' with
broad administrative privileges to manage the domain's documents, templates, users and roles. 
But the administrator of LoreForge can transfer this nominal 'ownership' to another user without 
disrupting the domain's records or subscriptions.

### Subdomains

A domain can contain **subdomains** — smaller, semi-independent archives 
that belong to a faction or department within the larger community. 
For example, a city roleplay might have a top-level domain for the city, 
with subdomains for the police department, the hospital, and the city 
government.

Subdomains work like this:
- Each subdomain has its own administrators(department heads), its own document types, 
  its own user permissions
- The parent domain's administrators('owners') can see and manage everything in 
  all of their subdomains
- Subdomains can share access with each other — for example, the police 
  department can grant hospital staff the ability to read certain records
- A document can be filed in one subdomain and linked to by another

### Users and Characters

A **user account** represents a real person. It is free to create, 
works across all communities they join, and is the account they log 
in with. A user can belong to many domains simultaneously and switches 
between them from a menu at the top of the screen.  A user account will
need to be linked with a second life player account.  The mechanism for
authenticating this with second life is something we'll figure out a little later
but the stub should exist from the start.

A **character** is a roleplay persona. A user may maintain multiple 
characters — for example, they might play different roles in different 
communities, or play multiple characters in the same community. 
Characters have their own profile pages with a name, portrait image, 
and descriptive fields. A character is linked to the user account that 
plays them, but this link is publicly visible — it is an "also known as" 
relationship, not a secret identity.

Characters can also be created without linking them to any user account, 
to represent non-player characters, historical figures, or people who 
are part of the story but not active players.

Characters are the entities that appear on documents. A marriage record 
names two characters. A property deed names a character as the owner. 
An incident report names the characters involved.

---

## What the System Does

### Filing Documents

The core action in LoreForge is filing a document — creating an official 
record of something that happened in the roleplay. Documents are written 
in plain text or markdown and can be as simple or as detailed as the 
community needs.

Every document belongs to a domain, lives in a folder within that 
domain, has a type (defined by the domain), and carries metadata 
like the date it was filed, who filed it, what characters are involved, 
and what tags apply to it.

### Document Types and Templates

Each community defines its own document types — Marriage License, 
Property Deed, Incident Report, Court Ruling, Employment Contract, 
whatever their story calls for. These types are not imposed by LoreForge; 
each domain creates the ones they need.

For each document type, the domain can create one or more **templates**. 
A template helps users fill out a new document correctly. It works in 
two ways:

- **Pre-filled text**: The template opens as a pre-formatted document 
  with placeholder text showing the user what to fill in and where
- **Wizard mode**: The template presents a short guided form that asks 
  for the key pieces of information and then assembles the document 
  automatically — which the user can then edit freely

Once a document is created from a template, it is a regular document 
that the user can edit however they like. The template is just a 
starting point.

### Document Lifecycle

Documents in LoreForge come in two varieties:

**Living documents** can be edited at any time. They represent things 
that change — a character's active employment record, an ongoing 
investigation file, a running log of city council minutes. An edit 
history is kept so administrators can see what changed and when.

**Locked documents** are filed once and become permanent. They represent 
official acts — a signed contract, a filed marriage license, a court 
ruling. Once locked, a document cannot be edited. Instead, changes are 
handled by filing new documents that are formally linked to the original:

- An **amendment** modifies or adds to the original record
- A **veto** or **nullification** officially overrides it

When viewing a locked document, the reader can see all amendments and 
vetoes attached to it. When viewing a list of documents, a status column 
shows at a glance whether each document is current, amended, or voided.

Statuses are defined by the domain — common examples might be Active, 
Amended, Voided, Expired, Divorced, Deceased, Closed.

### Linking Documents and Characters

Documents can reference each other. An arrest record might link to 
a prior incident report. A property deed might link to the contract 
that established the sale. These links are visible when reading a 
document and allow readers to navigate related records.

Documents are formally linked to the characters they involve. This is 
not just a text mention — it is a structured connection that the system 
tracks. This means a reader can look up a character and see all documents 
in the domain that involve them.

Documents can also link to documents in other domains. However, having 
a link to a document in another domain does not automatically give 
you permission to read it — the other domain's access rules still apply.

### Folders and Organization

Within a domain, documents are organized into folders. Folders can be 
nested. A police department subdomain might have folders for Active 
Cases, Closed Cases, Personnel Files, and Evidence Logs. A document can be moved 
from one folder to another while maintaining the rest of it's connections
and metadata, by anyone with the permissions to edit in both folders.

Folders are not just organizational — they are also units of permission. 
A user might have permission to file documents into the Active Cases 
folder but not to read Personnel Files. Folder-level permissions are 
managed separately from overall domain permissions and allow fine-grained 
control over who can see or do what within a domain's archive.

### Search

Users can search across all documents in the domain they are currently 
viewing. Search works across:

- The full text of documents
- Document type and status
- Tags applied to documents
- The names of characters linked to documents
- Who filed the document and when
- Any metadata fields the domain has configured

A user who belongs to multiple domains searches one domain at a time. 
They switch between domains using a dropdown at the top of the screen — 
no logout required.

---

## Access and Permissions

### Roles

Access in LoreForge is managed through **roles**. Each domain defines 
its own roles with names that match its community — Head Scribe, Senior 
Officer, Junior Clerk, Guest, whatever makes sense for that setting.

Each role has a list of subordinate roles.  These are configured through the 
permissions management interface.  If a role has permission to assign roles, they can
assign users to any of the roles listed as subordinate to their own roles.  If a user
has permission to create roles, all roles they create are automatically subordinate to them.

Users can hold multiple roles simultaneously. Their effective permissions 
are everything granted by any of their roles combined.

### Permissions

Permissions control what a user can do. The available permissions are:

- **Read** — view documents in the given folder.
- **Create documents** — file new documents
- **Edit documents** — modify existing documents (living documents only)
- **Delete documents** — remove documents
- **Transfer documents** — move documents from one folder or domain to another
- **Manage templates** — create and edit document templates
- **Manage folders** — create and organize folders
- **Manage users** — add and remove domain members
- **Manage roles** — create and configure roles, assign roles to users
- **Manage domain** — configure domain-level settings, theming, 
  subscription management


### Folder-Level Permission Overrides

Permissions can be adjusted at the folder level. A user who has general 
read access to a domain might be blocked from reading a specific 
sensitive folder. A user who generally cannot create documents might 
be granted that ability specifically within one folder they oversee. 
These overrides cascade down into subfolders.

---

## Appearance and Theming

Each domain can customize how LoreForge looks when their members are 
using it. At minimum this includes:

- Color scheme (primary and secondary colors, backgrounds, text colors)
- Logo
- Typography (font choices for headings and body text)

Advanced customization allows a domain to upload a full style override, 
enabling dramatically different visual treatments. A gothic courthouse 
archive and a sleek sci-fi starship registry can look like completely 
different applications while running on the same platform.

Theming applies everywhere the domain's members see the interface, 
including on public-facing pages.

---

## Public Access

Some documents and folders can be marked as publicly visible. When a 
domain enables public access, it gets a clean public web address that 
anyone — even people without a LoreForge account — can visit to browse 
the public portions of the archive. The public view displays the 
domain's theming, presenting the archive as an official-looking resource 
for that community's lore.

Having a link to a public document does not grant access to non-public 
documents in the same domain.

---

## Notifications and Activity

When things happen in a domain — a new document is filed, a document's 
status changes, a record is amended — members who have subscribed to 
those types of events receive a notification. Notifications appear as 
an unread count in the interface and can be reviewed in an inbox. 
Email notifications are also supported for users who prefer them.

Users can subscribe to:
- Specific document types ("notify me when any new Incident Report 
  is filed")
- Specific tags or folders
- Specific documents ("notify me if this contract is ever amended")

All activity is also logged whether or not anyone has subscribed to it, 
so administrators can review a complete history of what happened and when.

---

## Subscription Tiers

### Free User Account

Anyone can create a free LoreForge account. A free account lets you:
- Be invited to join any domain and participate according to your 
  assigned role there
- Create and file documents within domains where you have that permission
- Maintain a character list and profile

A free account does not include any personal storage or the ability 
to create your own domain.

### Personal Domain (Paid)

A paid personal account adds a small private domain(actually, one small personal domain PER 
true domain that they participate in) that belongs to 
that individual user. They can use it to:
- Store personal notes, character histories, and private records
- Optionally keep a linked copy of any document they file in a 
  community domain ("file it there, keep a copy here")
  personal domains can either copy the theme of the 'true' domain they are related to, or they
  can be personally styled by the user to their own theme.


### Community Domain (Organization Subscription)

A community domain subscription is purchased for an organization, not 
an individual. It provides:
- A full domain with subdomains, user management, theming, and all features
- The domain persists independently of any individual user — ownership 
  can be transferred

If a community domain subscription lapses:
1. A grace period begins (length is configurable)
2. The domain moves to read-only — members can read but not file 
   new documents
3. The domain moves to locked — no access for members
4. The platform owner is notified at each stage and again ten days 
   after full lockout
5. The domain's data is never deleted without direct action from 
   the platform owner

If a personal domain subscription lapses, the user is locked out 
immediately and the domain is deleted after a warning period.

---

## Second Life Integration

LoreForge is designed to integrate with the Second Life virtual world 
through a companion software bot. This integration enables features 
specific to Second Life roleplay communities:

- **Account verification**: Linking a LoreForge user account to a 
  verified Second Life account, confirming that the same real person 
  controls both
- **Location-based access**: Granting temporary access to a document 
  or domain based on a character being physically present at a specific 
  location inside Second Life.   A domain can have settings for the entire
  domain or subdomain that restrict even users with permissions from using
  the system if they're not at the location.   If this is enabled, it will be
  tested when the user attemps an action by sending an http message to the 
  inworld bot which will verify location and send back either a go or a nogo for the
  requested operation.
- **Notecard export**: Converting a LoreForge document into a Second Life 
  notecard (an in-world readable object) so players can access records 
  from within the game

These features are planned for a future phase and are not part of the 
initial release, but the system is designed from the start to 
accommodate them.

---

## Platform Administration

The platform owner has a full administrative dashboard showing:
- All domains on the platform and their subscription status
- Storage usage, user counts, and activity levels per domain
- Tools to manage the subscription lifecycle of any domain
- System alerts when domains enter grace periods, read-only, 
  or locked states

The platform owner receives automatic notifications at each stage of 
a domain's subscription lifecycle and makes the final decision about 
when (and whether) to permanently delete any community domain's data.
