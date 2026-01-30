import { 
      Tooltip,
      TooltipContent,
      TooltipProvider,
      TooltipTrigger,
} from "./ui/tooltip";


interface HintProps{
      label:string,
      children:React.ReactNode;
      asChild?:boolean;
      side?:"top"| "bottom" |"left" |"right";
      align?:"start";

}
export const Hint=({
      label,
      children,
      asChild,
      side,
      align,
}:HintProps)=>{
      return (
            <TooltipProvider>
                  <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild={asChild}>
                              {children}
                        </TooltipTrigger>
                              <TooltipContent
                              side={side}
                              align={align}
                              className="text-black bg-white border border-gray-300 rounded px-2 py-1 z-[9999]"
                              >
                              <p className="font-semibold">{label}</p>
                              </TooltipContent>

                  </Tooltip>
            </TooltipProvider>
      )

}
