import React from "react";
import { motion } from "framer-motion";
import { Menu, Phone, Search, ShoppingCart, User, ChevronDown, Star, Plus, Facebook, Instagram, Linkedin, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const navItems = [
  "Home",
  "Book a Service",
  "Vet Consultation",
  "Pharmacy",
  "Subscription",
  "More",
  "Contact Us",
];

const importanceCards = [
  {
    title: "Better Hygiene",
    desc: "Clean pet, fewer germs, fresher cuddles.",
    bg: "bg-purple-100",
  },
  {
    title: "Body Temperature",
    desc: "A trimmed fur helps regulate body heat.",
    bg: "bg-green-100",
  },
  {
    title: "Shedding and Tangling",
    desc: "Shiny, tangle-free coat with regular grooming.",
    bg: "bg-yellow-100",
  },
  {
    title: "Diseases Detection",
    desc: "Spot issues early, ensure timely care.",
    bg: "bg-orange-100",
  },
];

const groomingPlans = [
  {
    title: "Bath + Hygiene",
    price: "$45",
    features: [
      "Refreshing spa bath with ear cleaning, nail trimming, and sanitary cleaning.",
      "Refreshing spa bath with ear cleaning, nail trimming, and sanitary cleaning.",
    ],
  },
  {
    title: "Haircut + Hygiene",
    price: "$45",
    features: [
      "Custom haircut for your pet's breed and personality, plus hygiene care.",
      "Refreshing spa bath with ear cleaning, nail trimming, and sanitary cleaning.",
    ],
  },
  {
    title: "Full Grooming",
    price: "$45",
    features: [
      "Complete makeover with bath, haircut, and full hygiene care.",
      "Refreshing spa bath with ear cleaning, nail trimming, and sanitary cleaning.",
    ],
  },
];

const careSections = [
  {
    eyebrow: "Pet-First Approach:",
    title: "Building Trust from the Start",
    body:
      "Before a single brush or bath, our groomers take a few quiet moments to connect with your pet — no rushing, no stress. We speak in a soothing tone and use gentle movements, creating loving, secure, and joyful sessions that help your furry friend feel relaxed, safe, and ready to enjoy the grooming experience.",
    image:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    eyebrow: "Skin & Coat Assessment:",
    title: "Tailored to Your Pet's Unique Needs",
    body:
      "Every pet is different — some have sensitive skin, others a thick undercoat or curly fur that tangles easily. That is why we begin each session with a full skin and coat analysis. We check for dryness, dandruff, coat condition, hidden matting, shedding, and basic skin concerns to personalize your pet's treatment.",
    image:
      "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=80",
  },
  {
    eyebrow: "Quality Commitment:",
    title: "Because Your Pet Deserves the Best",
    body:
      "We use only the highest quality grooming products — pH-balanced, vet-approved, and free from harsh chemicals. Our tools are sanitized and designed to keep each pet safe and comfortable. We work with love, care, and attention to detail so your pet leaves looking sharp, feeling fresh, and tail-wagging happy.",
    image:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
  },
];

const testimonials = Array.from({ length: 4 }).map((_, i) => ({
  name: "Robbin Singh",
  role: i % 2 === 0 ? "Owner" : "Client",
  quote:
    "The support team was fast, kind, and incredibly helpful. The entire process felt simple and stress-free from booking to pickup.",
}));

const faqs = [
  {
    q: "How do you ensure the quality of your work?",
    a: "We maintain quality through trained groomers, pet-safe products, hygiene protocols, and a personalized approach for every breed and coat type.",
  },
  {
    q: "Can you customize your services to fit my specific needs?",
    a: "Yes. We can tailor packages based on breed, coat condition, skin sensitivity, age, behavior, and your preferred styling outcome.",
  },
  {
    q: "How do you stay current with industry trends and technologies?",
    a: "Our team regularly updates techniques, tools, and care standards through training, vendor learning, and ongoing service reviews.",
  },
  {
    q: "What is your process for starting a new project?",
    a: "Customers can browse services, choose a package, pick a slot, and complete booking online. Our team then confirms details and special notes.",
  },
  {
    q: "What kind of support is available for users?",
    a: "We offer booking support, grooming guidance, service updates, and follow-up assistance through phone, chat, and email.",
  },
];

function SectionTitle({ title, subtitle }) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-10">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-3 text-slate-500 text-sm md:text-base">{subtitle}</p>
    </div>
  );
}

export default function GroomingLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b bg-white/95 sticky top-0 z-50 backdrop-blur">
        <div className="bg-slate-50 border-b text-xs text-slate-600">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-medium">
              <MapPin className="w-3.5 h-3.5" /> Pet Care At Your Doorstep
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-violet-600">
                <Facebook className="w-3.5 h-3.5" />
                <Instagram className="w-3.5 h-3.5" />
                <Linkedin className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full">
                <Phone className="w-3.5 h-3.5" /> +91 95882 56568
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-xl border"><Menu className="w-5 h-5" /></button>
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-900">ALL TAILS</div>
              <div className="text-[10px] tracking-[0.25em] text-slate-500">PET'S BOUTIQUE</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <a key={item} href="#" className="hover:text-violet-600 transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 border rounded-full px-4 py-2 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input className="outline-none text-sm w-full" placeholder="Search here" />
            </div>
            <button className="p-2 rounded-full border"><ShoppingCart className="w-4 h-4" /></button>
            <button className="p-2 rounded-full border"><User className="w-4 h-4" /></button>
            <Button className="rounded-full bg-violet-600 hover:bg-violet-700">Treat Booking</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(0,0,0,0.72), rgba(0,0,0,0.28)), url('https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1600&q=80')",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-[1.2fr_420px] gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-white"
            >
              <p className="text-sm uppercase tracking-[0.25em] text-violet-200 mb-4">Premium Grooming</p>
              <h1 className="text-4xl md:text-6xl font-black leading-tight max-w-2xl">
                Dog Grooming Services Near You
              </h1>
              <p className="mt-4 max-w-xl text-white/85 text-lg">
                Transform your pet with expert grooming and spa care. Trusted by pet parents for safe, loving, and high-quality sessions.
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-xl mt-10">
                {[
                  ["1000+", "Professional Groomers"],
                  ["8+", "Years in Grooming"],
                  ["500", "Happy Customers"],
                ].map(([num, label]) => (
                  <div key={label} className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur px-4 py-4">
                    <div className="text-3xl font-black text-amber-300">{num}</div>
                    <div className="text-sm text-white/80 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="rounded-[28px] border-0 shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-violet-600 font-semibold">Book A Consultation</div>
                        <h3 className="text-2xl font-bold mt-1">Today's Available slot</h3>
                        <p className="text-sm text-slate-500 mt-2">Our consultants contact you shortly for your services.</p>
                      </div>
                      <div className="text-4xl">🐶</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                      <Input placeholder="Name" className="h-11 rounded-xl" />
                      <Input placeholder="Phone Number" className="h-11 rounded-xl" />
                    </div>
                    <button className="mt-3 h-11 w-full rounded-xl border flex items-center justify-between px-4 text-left text-sm text-slate-500">
                      <span>Select Your Service</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <Button className="mt-4 w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700">
                      Check Availability
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <SectionTitle
              title="Why is Pet Grooming Important?"
              subtitle="From grooming to checkups, we treat every pet like family — because they deserve nothing less."
            />
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              {importanceCards.map((item) => (
                <Card key={item.title} className={`rounded-3xl border-0 shadow-sm ${item.bg}`}>
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl mb-5">
                      🐾
                    </div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-sm text-slate-600 mt-2 leading-6">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4">
            <SectionTitle
              title="Grooming Options"
              subtitle="Choose the package that matches your pet's needs and comfort level."
            />

            <div className="flex justify-center mb-10">
              <div className="bg-slate-100 rounded-full p-1 inline-flex gap-1">
                <button className="px-5 py-2 rounded-full bg-violet-600 text-white text-sm font-medium">Individual Grooming</button>
                <button className="px-5 py-2 rounded-full text-sm font-medium text-slate-600">Grooming Packages</button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {groomingPlans.map((plan) => (
                <Card key={plan.title} className="rounded-3xl shadow-sm border-slate-200">
                  <CardContent className="p-7">
                    <div className="text-3xl mb-4">🐕</div>
                    <h3 className="text-2xl font-bold">{plan.title}</h3>
                    <div className="text-4xl font-black text-violet-600 mt-3">{plan.price}</div>
                    <p className="text-sm text-slate-500 mt-3">Display rates in Google organic search result and showcase services on your website.</p>
                    <Button className="mt-6 w-full rounded-xl bg-violet-600 hover:bg-violet-700">Book Now</Button>
                    <div className="mt-6">
                      <div className="text-sm font-semibold mb-3">Features included:</div>
                      <ul className="space-y-3 text-sm text-slate-600">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex gap-3">
                            <span className="text-violet-600 mt-0.5">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4">
            <SectionTitle
              title="Where Grooming Feels Like Love"
              subtitle="At All Tails, we build every grooming experience around comfort, trust, and emotional well-being."
            />

            <div className="space-y-10">
              {careSections.map((section, idx) => (
                <div key={section.title} className={`grid lg:grid-cols-2 gap-8 items-center ${idx % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  <div>
                    <div className="text-violet-600 text-2xl font-black mb-3">{section.eyebrow}</div>
                    <h3 className="text-3xl md:text-4xl font-black leading-tight">{section.title}</h3>
                    <p className="text-slate-600 mt-5 leading-7">{section.body}</p>
                  </div>
                  <div className="rounded-[28px] overflow-hidden shadow-sm bg-slate-100 aspect-[16/10]">
                    <img src={section.image} alt={section.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="rounded-[32px] bg-violet-600 text-white px-8 py-10 md:px-16 md:py-14 relative overflow-hidden">
              <div className="absolute left-6 bottom-0 text-7xl opacity-90">🐈</div>
              <div className="absolute right-6 bottom-0 text-7xl opacity-90">🐕</div>
              <div className="relative text-center max-w-3xl mx-auto">
                <h3 className="text-3xl md:text-5xl font-black leading-tight">Your pet deserves the best, choose our center today.</h3>
                <Button className="mt-6 rounded-full bg-white text-violet-700 hover:bg-white/90">Contact Us</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4">
            <SectionTitle
              title="World-Class Customer Support"
              subtitle="Whether it's for a few hours or a full day, we offer flexible, reliable care options for your furry companion."
            />
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              {testimonials.map((item, idx) => (
                <Card key={idx} className={`rounded-3xl shadow-sm ${idx === 1 ? "border-violet-500 ring-2 ring-violet-200" : ""}`}>
                  <CardContent className="p-6">
                    <p className="text-slate-600 text-sm leading-6">“{item.quote}”</p>
                    <div className="flex gap-1 mt-4 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100" />
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Meet Our Expert</div>
              <h2 className="text-4xl md:text-5xl font-black leading-tight mt-3">Got Questions? We've Got Answers!</h2>
              <p className="mt-4 text-slate-600 max-w-md">
                Whether it's for a few hours or a full day, we offer flexible, reliable care options for your furry companion.
              </p>
              <div className="mt-10 rounded-[32px] bg-amber-100 min-h-[320px] flex items-end justify-center text-8xl p-8">
                🐶
              </div>
            </div>

            <Card className="rounded-[32px] shadow-sm">
              <CardContent className="p-6 md:p-8">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-slate-600 leading-7">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-sky-100 py-10">
          <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-[180px_1fr_180px] gap-6 items-center">
            <div className="flex items-center gap-3 text-6xl justify-center lg:justify-start">
              <span>🐶</span>
              <span>🐱</span>
            </div>
            <div className="text-center lg:text-left">
              <h3 className="text-2xl md:text-3xl font-black">Pampering and care, schedule your perfect day!</h3>
              <p className="text-slate-600 mt-2">App is available for free on app store</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-5">
                <Button className="rounded-xl bg-slate-900 hover:bg-slate-800">Google Play</Button>
                <Button className="rounded-xl bg-slate-900 hover:bg-slate-800">App Store</Button>
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-end gap-4 text-6xl">
              <span>🐾</span>
              <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center text-xl font-black">QR</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-2 xl:grid-cols-5 gap-10">
          <div className="xl:col-span-1">
            <div className="text-2xl font-black tracking-tight">ALL TAILS</div>
            <div className="text-[10px] tracking-[0.25em] text-slate-500">PET'S BOUTIQUE</div>
            <p className="text-sm text-slate-600 mt-4 leading-6">
              All Tails is your one-stop platform for expert pet care. From home visits and salon consultations to products and planning services, we're here to make pet parenting easier, safer, and more convenient.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              {['About Us', 'Terms & Conditions', 'Privacy Policy', 'Contact Us'].map((item) => (
                <li key={item}><a href="#" className="hover:text-violet-600">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Services</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              {['Consultation', 'Pharmacy', 'Home Care', 'E-Healthcard'].map((item) => (
                <li key={item}><a href="#" className="hover:text-violet-600">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Categories</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              {['Shop by Pet', 'Grooming', 'Food & Treats', 'Accessories', 'Supplements'].map((item) => (
                <li key={item}><a href="#" className="hover:text-violet-600">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Our Newsletter</h4>
            <p className="text-sm text-slate-600 mb-4">Get updates by subscribing to our weekly newsletter</p>
            <div className="flex gap-2">
              <Input placeholder="Enter your email" className="rounded-xl" />
              <Button className="rounded-xl bg-violet-600 hover:bg-violet-700">Subscribe</Button>
            </div>
            <div className="flex items-center gap-3 mt-8 text-slate-500">
              <Facebook className="w-4 h-4" />
              <Instagram className="w-4 h-4" />
              <Linkedin className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="border-t py-5 text-sm text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div>Copyright © Pasticle. All Rights Reserved.</div>
            <div>Follow us on social media</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
