'use client';

import {
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TTag = {
  key: string;
  name: string;
};

type MultipleSelectProps = {
  tags: TTag[];
  customTag?: (item: TTag) => ReactNode | string;
  onChange?: (value: TTag[]) => void;
  defaultValue?: TTag[];
  label?: ReactNode;
  className?: string;
  selectedClassName?: string;
  optionsClassName?: string;
  tagClassName?: string;
};

export const MultipleSelect = ({
  tags,
  customTag,
  onChange,
  defaultValue,
  label,
  className,
  selectedClassName,
  optionsClassName,
  tagClassName,
}: MultipleSelectProps) => {
  const [selected, setSelected] = useState<TTag[]>(defaultValue ?? []);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef?.current) {
      containerRef.current.scrollBy({
        left: containerRef.current?.scrollWidth,
        behavior: 'smooth',
      });
    }
    onChange?.(selected);
  }, [selected, onChange]);

  const onSelect = (item: TTag) => {
    setSelected((prev) => [...prev, item]);
  };

  const onDeselect = (item: TTag) => {
    setSelected((prev) => prev.filter((i) => i !== item));
  };

  return (
    <AnimatePresence mode={'popLayout'}>
      <div className={cn('flex w-full flex-col gap-2', className)}>
        {label ? <div className="text-sm font-medium">{label}</div> : null}
        <motion.div
          layout
          ref={containerRef}
          className={cn(
            'selected no-scrollbar flex min-h-12 w-full items-center overflow-x-scroll scroll-smooth rounded-md border border-border bg-background p-2',
            selectedClassName
          )}
        >
          <motion.div layout className='flex items-center gap-2'>
            {selected?.map((item) => (
              <Tag
                name={item?.key}
                key={item?.key}
                className={cn('bg-muted shadow-sm', tagClassName)}
              >
                <div className='flex items-center gap-2'>
                  <motion.span layout className={'text-nowrap'}>
                    {item?.name}
                  </motion.span>
                  <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onDeselect(item)}>
                    <X size={14} />
                  </button>
                </div>
              </Tag>
            ))}
          </motion.div>
        </motion.div>
        {tags?.length > selected?.length && (
          <div className={cn('flex w-full flex-wrap gap-2 rounded-md border border-border bg-background p-2', optionsClassName)}>
            {tags
              ?.filter((item) => !selected?.some((i) => i.key === item.key))
              .map((item) => (
                <Tag
                  name={item?.key}
                  onClick={() => onSelect(item)}
                  key={item?.key}
                  className={tagClassName}
                >
                  {customTag ? (
                    customTag(item)
                  ) : (
                    <motion.span layout className={'text-nowrap'}>
                      {item?.name}
                    </motion.span>
                  )}
                </Tag>
              ))}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

type TagProps = PropsWithChildren &
  Pick<HTMLAttributes<HTMLDivElement>, 'onClick'> & {
    name?: string;
    className?: string;
  };

export const Tag = ({ children, className, name, onClick }: TagProps) => {
  return (
    <motion.div
      layout
      layoutId={name}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-md bg-muted px-2 py-1 text-sm text-foreground',
        className
      )}
    >
      {children}
    </motion.div>
  );
};
