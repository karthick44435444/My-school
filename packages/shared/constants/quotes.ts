// packages/shared/constants/quotes.ts

export const MOTIVATIONAL_QUOTES = [
  "Education is the most powerful weapon which you can use to change the world. – Nelson Mandela",
  "The beautiful thing about learning is that no one can take it away from you. – B.B. King",
  "Success is the sum of small efforts repeated day in and day out. – Robert Collier",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "Learning never exhausts the mind. – Leonardo da Vinci",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "Every expert was once a beginner. – Helen Hayes",
  "The more that you read, the more things you will know. – Dr. Seuss",
  "It always seems impossible until it's done. – Nelson Mandela",
  "Dream big and dare to fail. – Norman Vaughan",
  "The expert in anything was once a beginner. – Helen Hayes",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "The secret of getting ahead is getting started. – Mark Twain",
  "Your limitation—it's only your imagination.",
  "Hard work beats talent when talent doesn't work hard.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "You are capable of amazing things.",
];

export function getRandomQuote(): string {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[index];
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}
