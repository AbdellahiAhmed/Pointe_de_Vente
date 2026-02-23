import {
  FC,
  InputHTMLAttributes,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import classNames from "classnames";
import Mousetrap from "mousetrap";
import { defaultData } from "../../../store/jotai";
import { useAtom } from "jotai";
import { useShortcutKey } from "../../../core/shortcuts/use-shortcut-key";

interface Props
  extends PropsWithChildren,
    InputHTMLAttributes<HTMLSpanElement> {
  shortcut?: string;
  actionId?: string;
  handler: (e: Event) => void;
  invisible?: boolean;
}

export const Shortcut: FC<Props> = ({ children, ...rest }) => {
  const [defaultState] = useAtom(defaultData);
  const { displayShortcuts, enableShortcuts: state } = defaultState;

  // Resolve the key: actionId takes priority, then fallback to shortcut prop
  const registryKey = useShortcutKey(rest.actionId ?? '');
  const resolvedKey = rest.actionId ? registryKey : (rest.shortcut ?? '');

  const [visible, setVisible] = useState<boolean | undefined>(rest.invisible);

  useEffect(() => {
    setVisible(displayShortcuts);
  }, [displayShortcuts]);

  useEffect(() => {
    if (!resolvedKey) return;

    const handler = function (e: any) {
      // only run shortcuts when there is no modal active
      if (!document.body.classList.contains("ReactModal__Body--open")) {
        e.preventDefault();
        e.stopPropagation();

        rest.handler(e);
      }

      return false;
    };

    if (state) {
      Mousetrap.bind(resolvedKey, handler);
    } else {
      Mousetrap.unbind(resolvedKey, handler);
    }

    return () => Mousetrap.unbind(resolvedKey, handler);
  }, [state, resolvedKey, rest.handler]);

  if (!state) {
    return <></>;
  }

  if (rest.invisible) {
    return <></>;
  }

  return (
    <>
      {visible && (
        <span
          className={classNames(
            "text-sm ms-2 bg-black/70 text-white px-1 rounded shadow",
            rest.className && rest.className
          )}>
          {resolvedKey}
        </span>
      )}
    </>
  );
};
