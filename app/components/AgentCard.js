import Image from "next/image";

export default function AgentCard({ id, agent, photoSrc }) {
  return (
    <div
      className="flex items-center overflow-hidden gap-4 p-4 bg-white"
    >
      <div className="flex-none flex items-center justify-center relative aspect-4/4 h-40 sm:h-40 md:h-60 overflow-hidden bg-gray-300">
        {photoSrc ? (
          <Image
            src={photoSrc}
            alt={agent.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            quality={[100, 75]}
            className="object-cover"
            loading="eager"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-1/2 h-1/2 text-zinc-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        )}
      </div>

      <div aria-label="Agent Information" className="flex-1 min-w-0 flex items-center h-full">
        <div className="w-full text-left"> 
          <div className="text-lg font-semibold">{agent.name}</div>
          <div className="text-sm pb-4">{agent.license}</div>
          {/* format as phone number */}
          <div className="text-sm">{agent.phone ? agent.phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1)$2-$3") : ""}</div>
          <div className="text-sm">{agent.email || ""}</div>
          <div className="text-sm">DRE #{agent.dre_num || ""}</div>
        </div>
      </div>
    </div>
  );
}
