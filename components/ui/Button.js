import Link from 'next/link';
import styles from './Button.module.css';

const Button = ({ href, children, variant = 'primary', ...props }) => {
  const buttonClasses = `${styles.button} ${styles[variant]}`;

  if (href) {
    return (
      <Link href={href}>
        <a className={buttonClasses} {...props}>
          {children}
        </a>
      </Link>
    );
  }

  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;
