# 🌱 Eden Pods — Food Forest Tracker

**Throw a seed pod. Log it on-chain. Track it into a living food forest.**

Eden Pods is a mobile-first Web3 app that turns *throwing a seed pod* into a
permanent on-chain record—then turns that record into a living food-forest
tracker. It sits at the intersection of regenerative agriculture, permaculture
design, and blockchain technology, using **Algorand ARC-69 NFTs** as
proof-of-action for real-world planting events.

**One-liner:** *Throw a pod → log it in four taps → mint an on-chain record → track
growth stages → log harvests → build a forest over time.*

---

## 📚 Table of Contents

- [🚀 Quickstart (GitHub Codespaces)](#-quickstart-github-codespaces)
- [🌿 What It Is](#-what-it-is)
- [🧠 The Problem It Solves](#-the-problem-it-solves)
- [🌍 The Birthright Concept](#-the-birthright-concept)
- [⚙️ How It Works (Technical)](#️-how-it-works-technical)
  - [Wallet and Identity](#wallet-and-identity)
  - [NFT Minting (ARC-69)](#nft-minting-arc-69)
  - [Growth Tracking](#growth-tracking)
  - [Harvest Logging](#harvest-logging)
  - [Notifications](#notifications)
  - [Offline-First Architecture](#offline-first-architecture)
- [🫘 Pod Types](#-pod-types)
- [🍲 Recipe System](#-recipe-system)
- [✅ Current State](#-current-state)
- [🚧 What It Is Not Yet](#-what-it-is-not-yet)
- [🔭 Vision Beyond the POC](#-vision-beyond-the-poc)

---

## 🚀 Quickstart (GitHub Codespaces)

This project is intended to be run in **GitHub Codespaces**.

### 1) Create a Codespace

In GitHub: **Code → Codespaces → Create codespace on main**

### 2) Install dependencies

```bash
cd apps/web
npm install
nvm install 20
nvm use 20
```

### 3) Run the dev server

```bash
npm run dev
```

### 4) Open the app

Open the forwarded port shown by Codespaces (typically `http://localhost:3000`).

Codespaces usually auto-forwards ports — check the **Ports** tab if needed.

---

## 🌿 What It Is

Eden Pods is a mobile-first Next.js app where each seed-pod throw becomes an
immutable on-chain artifact.

**Core loop:**

1. Throw a seed pod onto land
2. Open the app
3. Log the throw in four taps
4. Mint an ARC-69 NFT on Algorand testnet recording what/when/where
   (privacy-preserving)
5. Track biologically grounded growth stages over time
6. Log harvests (on-chain or locally) and close the loop to the kitchen

---

## 🧠 The Problem It Solves

Guerrilla gardening, seed bombing, and food-forest planting share a failure
mode: **no memory**.

Once seeds are thrown:

- there’s no durable record of what was planted,
- no way to track whether it grew,
- no coordination layer,
- and no proof the action happened at all.

Eden Pods makes the throw itself a permanent public record via blockchain. In
five years, you can open your wallet and see:

- every throw you made,
- which stage each planting is in,
- and how much food came from it.

---

## 🌍 The Birthright Concept

Eden Pods is built on a simple idea: **food-producing land and knowledge are a
human birthright**, not something that must be enclosed and commodified.

The app’s answer is the **Birthright Forest Kit**: a curated set of 12–24 pod
types designed to establish a self-replicating, multi-layered food forest with
zero ongoing maintenance after the initial throw.

The app includes a projection model that visualizes compounding growth:

- **12 pods → hundreds of plants in ~3 years**
- → **thousands in ~5 years** (via self-seeding)

A dedicated Birthright screen shows:

- a year-by-year growth chart
- zone rotation guidance (harvest nearest zones first; leave outermost zones
  alone to spread)

---

## ⚙️ How It Works (Technical)

### Wallet and Identity

- Uses **Pera Wallet** as the only identity layer
- No accounts, usernames, or passwords
- Your wallet address is your identity
- Connecting Pera is the only onboarding step

### NFT Minting (ARC-69)

Each throw mints one **ARC-69 NFT** on Algorand **testnet**.

ARC-69 stores metadata in the transaction note field rather than on an external
server—making the data permanently on-chain and queryable via the indexer
without any backend.

Each minted record includes:

- pod type (species mix, growth model, nutrition tags)
- throw date + time
- location label (human-readable descriptor — **no GPS**, privacy by design)
- growth model ID
- wallet address of thrower
- app version

**Cost:** ~0.001 ALGO per asset creation (network fees; typically confirmed in
seconds).

### Growth Tracking

- Computed entirely client-side from the on-chain throw date
- No backend, no cron jobs, no servers
- App calculates elapsed days and maps to a pod type’s growth model

Currently defined: **5 growth models**

- Temperate herbs
- Temperate shrubs
- Tropical fast-growing species
- Temperate annuals
- Temperate vines

Each model has **6 stages** (germination → established self-seeding), each with:

- day range
- what to expect
- harvesting guidance

### Harvest Logging

Two options:

1) **On-chain harvests**
- 0-ALGO payment transaction to self
- ARC-69 metadata in the note
- links harvest to the throw’s ASA ID

2) **Local harvests**
- stored in `localStorage`
- for users who don’t want to sign a transaction for every picking

Harvests are displayed with:

- quantity classes (small handful / medium bowlful / large basketful)
- approximate gram weights

### Notifications

- Stage transition notifications are scheduled client-side after throw
  confirmation
- Stored in `localStorage` with timestamps based on the growth model
- They appear in the in-app notification center once their time passes
- No push notification infrastructure is required for the POC

### Offline-First Architecture

Three-layer caching strategy using `localStorage`:

1) **Confirmed throws cache (per wallet)**  
Loads dashboard instantly without waiting on the indexer.

2) **Pending throws cache**  
Signed + submitted but not yet indexed. Stored with a **5-minute TTL**.  
App polls the indexer every **5 seconds** until confirmed or timeout.

3) **Local state cache**  
Observations, harvests, notifications stored separately and reloaded every
**30 seconds**.

---

## 🫘 Pod Types

Six pod mixes are currently defined, each mapped to a growth model:

| Pod Type | Contents (examples) | Climate | Difficulty |
|---|---|---|---|
| 🌼 Meadow Mix | Yarrow, red clover, calendula, dandelion | Temperate | Easy |
| 🌿 Forest Edge | Elderberry, blackcurrant, nettle, wood sorrel | Temperate | Easy |
| 🌱 Herb Spiral | Mint, lemon balm, yarrow, calendula | Temperate | Easy |
| 🌴 Tropical Canopy | Moringa, sweet potato, amaranth | Tropical | Easy |
| 🌾 Grain Guild | Amaranth, sunflower | Temperate | Moderate |
| 🍇 Vine Canopy | Nasturtium | Temperate | Easy |

Each pod type includes:

- nutrition tags
- list of constituent plants
- links to curated recipes using those plants

This connects the throw all the way to the kitchen.

---

## 🍲 Recipe System

The app includes **10 built-in recipes**, linked to plants in one or more pod
types.

Recipes:

- appear in the throw detail view once relevant plants are in the mix
- range from fast (e.g., 5-minute dandelion salad) to long-ferment
  (e.g., 2-week nasturtium caper pickle)
- include foraging notes (how much to harvest, what to leave for pollinators)

**Goal:** close the loop between planting → tracking → harvesting → eating.

---

## ✅ Current State

Eden Pods is a working proof of concept on Algorand **testnet**. Core mechanics
implemented:

- Pera Wallet connection + session persistence
- 4-step throw wizard with optimistic UI
- ARC-69 NFT minting with real on-chain confirmation
- Indexer-based throw history loaded every session
- Growth stage computation + progress tracking
- Stage transition notifications via `localStorage`
- On-chain and local harvest logging
- Birthright projection with interactive chart
- Zone rotation guidance

UI is mobile-first (max width **512px**), styled with a custom green palette.  
Runs as a standard **Next.js 14** app with no custom backend; chain interaction
goes directly to **Algonode’s public testnet endpoints**.

---

## 🚧 What It Is Not Yet

- Not on mainnet
- No GPS or map integration
- No social features (throws are private to the wallet that made them)
- No push notifications (in-app only)
- No community throw feed / no way to see others' forests
- Pod types are hardcoded (no on-chain pod type registry yet)

---

## 🔭 Vision Beyond the POC

The natural next steps, in rough order of impact:

1) **Mainnet deployment**  
Switch Algonode endpoint and Pera network parameter from testnet → mainnet.

2) **Social forest feed**  
Public indexer query showing all Eden throw transactions across all wallets,
creating a global map of food forest activity.

3) **On-chain pod registry**  
Pod types defined as Algorand Standard Assets or app state rather than hardcoded
in the client, allowing community-contributed pod designs.

4) **Native push notifications**  
A lightweight service worker that checks scheduled notification timestamps and
fires native browser notifications even when the app is closed.

5) **Physical pod QR codes**  
Each physical seed pod sold or distributed comes with a QR code that deep-links
to the throw wizard pre-configured for that pod type.

6) **Harvest aggregation**  
A dashboard view showing total food produced across all throws, with nutritional
breakdowns by tag, giving users a picture of what their forest contributes to
their diet over time.

7) **DAO governance**  
Governance of the pod registry, zone guidelines, and protocol parameters could
move to an on-chain DAO as the network grows—making Eden Pods a community-owned
food system protocol.
