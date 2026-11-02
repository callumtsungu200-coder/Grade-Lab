/* Personal mock (PPE) topic list, shown only to the accounts in MOCK_EMAILS.
   Point wording comes from the "PPE topics" slides, one section per slide.
   `cards` are ids of existing flashcards (see flattenCards), so marking one
   here updates the same progress as the main deck. */

export const MOCK_SUBJECT_ID = 'computer-science'
export const MOCK_EMAILS = ['cctsungu@gmail.com']

export interface MockPoint {
  id: string
  text: string
  sub?: string[]
}

export interface MockSection {
  id: string
  title: string
  points: MockPoint[]
  cards: string[]
}

export function hasMockPage(email: string | null | undefined, subjectId: string): boolean {
  return subjectId === MOCK_SUBJECT_ID && MOCK_EMAILS.includes((email || '').trim().toLowerCase())
}

export const MOCK_SECTIONS: MockSection[] = [
  {
    id: 'sound-images',
    title: 'Sound & images',
    points: [
      { id: 'sound', text: 'How sound can be sampled and stored in digital form' },
      { id: 'pixels', text: 'How an image is represented as a series of pixels, represented in binary' },
      { id: 'image-size', text: 'image file size = colour depth x image height (px) x image width (px)' },
    ],
    cards: [
      '1.2|What is sample rate?',
      '1.2|What is bit depth in sound?',
      '1.2|Give the sound file size formula.',
      '1.2|How is an image stored?',
      '1.2|What is colour depth?',
      '1.2|What is resolution?',
      '1.2|Give the image file size formula.',
    ],
  },
  {
    id: 'storage',
    title: 'Storage',
    points: [
      { id: 'types', text: 'Common types of storage', sub: ['optical', 'solid state'] },
      {
        id: 'suitable',
        text: 'Suitable storage devices and storage media for a given application, and the advantages and disadvantages of these, using characteristics',
        sub: ['capacity', 'speed', 'portability', 'durability', 'reliability', 'cost'],
      },
    ],
    cards: [
      '1.2|Why is secondary storage needed?',
      '1.2|Give features of optical storage (CD/DVD).',
      '1.2|Give features of solid state storage (SSD).',
      '1.2|List characteristics used to compare storage.',
    ],
  },
  {
    id: 'networks',
    title: 'Networks',
    points: [
      { id: 'types', text: 'Types of networks', sub: ['LAN (Local Area Network)', 'WAN (Wide Area Network)'] },
      { id: 'topologies', text: 'Star and Mesh network topologies' },
      { id: 'performance', text: 'Factors that affect the performance of networks' },
      { id: 'connection', text: 'Modes of connection', sub: ['Wired: Ethernet', 'Wireless: Wi-Fi, Bluetooth'] },
      { id: 'addressing', text: 'IP addressing and MAC addressing' },
    ],
    cards: [
      '1.3|What is a LAN?',
      '1.3|What is a WAN?',
      '1.3|Describe a star topology.',
      '1.3|Give an advantage of a star topology.',
      '1.3|Describe a mesh topology.',
      '1.3|Give an advantage of a mesh topology.',
      '1.3|List factors affecting network performance.',
      '1.3|What is bandwidth?',
      '1.3|Compare wired and wireless connections.',
      '1.3|What is an IP address?',
      '1.3|What is a MAC address?',
    ],
  },
  {
    id: 'hardware-internet',
    title: 'Network hardware, the internet & binary addition',
    points: [
      {
        id: 'hardware',
        text: 'The hardware needed to connect stand-alone computers into a Local Area Network',
        sub: ['wireless access points', 'routers', 'switches', 'NIC (Network Interface Controller/Card)', 'transmission media'],
      },
      {
        id: 'internet',
        text: 'The internet as a worldwide collection of computer networks',
        sub: ['DNS (Domain Name Server)'],
      },
      {
        id: 'binary-add',
        text: 'Add two binary integers together (up to and including 8 bits) and explain overflow errors which may occur',
      },
    ],
    cards: [
      '1.3|What is a WAP?',
      '1.3|What does a router do?',
      '1.3|What does a switch do?',
      '1.3|What is a NIC?',
      '1.3|Give examples of transmission media.',
      '1.3|What is the internet?',
      '1.3|What is the role of DNS?',
      '1.2|What is an overflow error?',
    ],
  },
  {
    id: 'algorithms-programming',
    title: 'Algorithms & programming',
    points: [
      { id: 'search', text: 'Standard searching algorithms', sub: ['linear search'] },
      { id: 'sort', text: 'Standard sorting algorithms', sub: ['bubble sort', 'merge sort', 'insertion sort'] },
      { id: 'sql', text: 'The use of SQL to search for data' },
      { id: 'data-types', text: 'The use of data types', sub: ['integer', 'string'] },
      {
        id: 'arrays',
        text: 'The use of arrays (or equivalent) when solving problems, including both one-dimensional (1D) and two-dimensional arrays (2D)',
      },
      { id: 'sub-programs', text: 'How to use sub programs (functions and procedures) to produce structured code' },
      { id: 'trace', text: 'Trace tables' },
    ],
    cards: [
      '2.1|What is a linear search?',
      '2.1|How does a bubble sort work?',
      '2.1|How does a merge sort work?',
      '2.1|How does an insertion sort work?',
      '2.1|Which sort is usually fastest for large lists?',
      '2.1|What is a trace table?',
      '2.2|What does the SQL SELECT command do?',
      '2.2|What do FROM and WHERE do in SQL?',
      '2.2|What is the integer data type?',
      '2.2|Difference between a character and a string?',
      '2.2|What is an array?',
      '2.2|What is a 2D array often used for?',
      '2.2|Are arrays fixed or variable length in OCR J277?',
      '2.2|What is a function?',
      '2.2|What is a procedure?',
      '2.2|Why use sub programs?',
    ],
  },
  {
    id: 'boolean',
    title: 'Boolean logic',
    points: [
      { id: 'diagrams', text: 'Simple logic diagrams using the operations AND, OR and NOT' },
      { id: 'truth-tables', text: 'Truth tables' },
      { id: 'combining', text: 'Combining Boolean operators using AND, OR and NOT to two levels' },
      { id: 'applying', text: 'Applying logical operators in appropriate truth tables to solve problems' },
      {
        id: 'symbols',
        text: 'Know the logic gate symbols',
        sub: ['AND (Conjunction)', 'OR (Disjunction)', 'NOT (Negation)'],
      },
    ],
    cards: [
      '2.2|Name the three Boolean operators.',
      '2.4|What does an AND gate do?',
      '2.4|What does an OR gate do?',
      '2.4|What does a NOT gate do?',
      '2.4|Complete: 1 AND 0 = ?',
      '2.4|Complete: 1 AND 1 = ?',
      '2.4|Complete: 0 OR 0 = ?',
      '2.4|Complete: 1 OR 0 = ?',
      '2.4|Complete: NOT 0 = ?',
      '2.4|What is a truth table?',
      '2.4|How many rows does a 2-input truth table have?',
      '2.4|What is a logic diagram?',
    ],
  },
]
