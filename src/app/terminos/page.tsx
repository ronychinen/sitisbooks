import Link from "next/link";
import { TERMS_UPDATED } from "@/lib/terms";

export const metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso y política de privacidad de Sitisbooks, la plataforma de intercambio de libros en Lima.",
  alternates: { canonical: "/terminos" },
};

const CONTACT = <a href="mailto:sitisbooks@gmail.com">sitisbooks@gmail.com</a>;

const SECTIONS = [
  ["servicio", "Qué es Sitisbooks"], ["cuenta", "Registro y cuenta"], ["creditos", "Créditos"],
  ["donar", "Publicar y donar libros"], ["entrega", "Compromiso de entrega"], ["pedidos", "Pedidos, pagos y reembolsos"],
  ["estado", "Estado de los libros y reclamos"], ["conducta", "Conductas prohibidas"], ["suspension", "Suspensión de cuentas"],
  ["responsabilidad", "Limitación de responsabilidad"], ["propiedad", "Propiedad intelectual"], ["privacidad", "Política de privacidad"],
  ["reclamos", "Atención de reclamos"], ["cambios", "Cambios a estos términos"], ["ley", "Ley aplicable"],
];

export default function Page() {
  return (
    <article className="legal stack">
      <div>
        <p className="eyebrow">Última actualización: {TERMS_UPDATED}</p>
        <h1>Términos y condiciones</h1>
        <p>Estos términos regulan el uso de la plataforma Sitisbooks (sitisbooks.com). Al crear tu cuenta y marcar la casilla de aceptación, declaras haberlos leído y aceptado. Si no estás de acuerdo, no uses la plataforma.</p>
      </div>
      <nav className="toc" aria-label="Contenido"><ol>{SECTIONS.map(([id, t]) => <li key={id}><a href={`#${id}`}>{t}</a></li>)}</ol></nav>

      <section><h2 id="servicio">1. Qué es Sitisbooks</h2>
        <ol>
          <li>Sitisbooks es una plataforma que conecta a personas que donan libros usados con personas que desean recibirlos, dentro de Lima Metropolitana y el Callao.</li>
          <li>Sitisbooks no vende libros ni es propietario de los libros publicados. Los libros pertenecen a quienes los publican hasta su entrega.</li>
          <li>Lo que Sitisbooks cobra es (a) el costo del delivery, calculado según la distancia de la ruta de recojo y entrega, y (b) una comisión fija por la coordinación de cada intercambio. Los montos se muestran antes de confirmar cada pedido.</li>
          <li>Sitisbooks coordina el recojo y la entrega directamente con cada usuario, por WhatsApp u otros medios de contacto que registres.</li>
        </ol></section>

      <section><h2 id="cuenta">2. Registro y cuenta</h2>
        <ol>
          <li>Para usar la plataforma debes ser mayor de 18 años y registrarte con un correo electrónico válido.</li>
          <li>Te comprometes a registrar datos verdaderos, completos y actualizados (nombre, celular y direcciones). Sitisbooks puede suspender cuentas con datos falsos.</li>
          <li>Cada persona puede tener una sola cuenta. Crear varias cuentas, por ejemplo para obtener más créditos de bienvenida, está prohibido.</li>
          <li>Eres responsable de mantener seguro el acceso a tu correo, porque es el medio con el que ingresas. Todo lo que se haga desde tu cuenta se considera hecho por ti.</li>
          <li>Puedes solicitar la eliminación de tu cuenta escribiéndonos. Los intercambios en curso deberán completarse o cancelarse antes.</li>
        </ol></section>

      <section><h2 id="creditos">3. Créditos</h2>
        <ol>
          <li>Un crédito permite pedir un libro. Se obtiene (a) al registrarte, como crédito de bienvenida, (b) cuando un libro que donaste es entregado a su nuevo lector, (c) comprándolo, cuando esta opción esté disponible, o (d) por el programa de referidos.</li>
          <li>Programa de referidos: si una persona se registra desde tu enlace de invitación y su primer libro donado es entregado a su nuevo lector, ambos reciben 1 crédito, una sola vez por persona invitada. Invitarte a ti mismo, crear cuentas falsas o cualquier otro uso indebido anula los créditos obtenidos y puede causar la suspensión de la cuenta. Sitisbooks puede modificar o terminar este programa en cualquier momento, respetando los créditos ya ganados.</li>
          <li>Los créditos no son dinero ni medio de pago, no generan intereses y no pueden canjearse por efectivo ni transferirse a otras cuentas.</li>
          <li>El crédito por donar se acredita solo cuando el libro llega a su destinatario, no al publicarlo.</li>
          <li>Los créditos comprados se acreditan cuando Sitisbooks valida el pago. No son reembolsables una vez acreditados, salvo error atribuible a Sitisbooks o lo que disponga la normativa de protección al consumidor.</li>
          <li>Si tu cuenta es suspendida por incumplir estos términos, perderás los créditos disponibles, incluidos los obtenidos de forma indebida.</li>
          <li>Sitisbooks puede corregir créditos acreditados por error.</li>
        </ol></section>

      <section><h2 id="donar">4. Publicar y donar libros</h2>
        <p>Al publicar un libro declaras y garantizas que:</p>
        <ol>
          <li>Eres el propietario legítimo del libro y tienes derecho a donarlo. No es robado, prestado, ni pertenece a una biblioteca, institución o tercero.</li>
          <li>Es un ejemplar original. Está prohibido publicar fotocopias, impresiones o copias no autorizadas, que infringen derechos de autor.</li>
          <li>El título, el autor, la portada y el estado que indicas corresponden al ejemplar real que entregarás.</li>
          <li>El libro no contiene material ilícito ni objetos en su interior, y su contenido no está prohibido por la ley peruana.</li>
          <li>No incluirás teléfonos, correos, redes sociales ni otros datos de contacto en la publicación.</li>
        </ol>
        <p>Al entregar el libro, transfieres su propiedad de forma gratuita y definitiva a quien lo recibe. Sitisbooks puede retirar del catálogo cualquier publicación que incumpla estas reglas.</p></section>

      <section><h2 id="entrega">5. Compromiso de entrega</h2>
        <ol>
          <li>Mientras tu libro esté publicado, debe estar disponible para entregarse. Si ya no lo tienes, retíralo del catálogo desde “Donar un libro”.</li>
          <li>Cuando alguien pide tu libro, te comprometes a entregarlo en la dirección de recojo que elegiste y en la fecha y hora coordinadas con Sitisbooks.</li>
          <li>Se considera incumplimiento: negarte a entregar un libro pedido, no estar presente en dos intentos de recojo coordinados sin aviso previo, entregar un libro distinto al publicado o en un estado claramente peor al declarado.</li>
          <li>El incumplimiento del compromiso de entrega es causa de suspensión definitiva de la cuenta y de pérdida de sus créditos. Además, Sitisbooks podrá cobrar el costo del recojo fallido cuando la falta sea atribuible al donante.</li>
        </ol></section>

      <section><h2 id="pedidos">6. Pedidos, pagos y reembolsos</h2>
        <ol>
          <li>Al pedir un libro usas 1 crédito y el ejemplar queda reservado. Debes pagar el delivery y la comisión por Yape o transferencia y subir el comprobante.</li>
          <li>Sitisbooks valida cada comprobante. Si el pago no se puede verificar, te pediremos corregirlo; un pedido sin pago válido puede cancelarse y el libro vuelve al catálogo.</li>
          <li>Puedes cancelar un pedido mientras no lo hayas pagado; recuperas tu crédito.</li>
          <li>Si el intercambio no puede completarse por causas atribuibles al donante o a Sitisbooks, te devolvemos el crédito y el monto pagado.</li>
          <li>Debes estar presente en la dirección de entrega en la fecha coordinada. Si la entrega falla dos veces por tu ausencia o por datos incorrectos, el pedido puede cancelarse sin devolución del delivery y del crédito, y los nuevos intentos de entrega tendrán costo adicional.</li>
          <li>Los montos pagados no incluyen el valor del libro, que es una donación.</li>
        </ol></section>

      <section><h2 id="estado">7. Estado de los libros y reclamos</h2>
        <ol>
          <li>El estado de cada libro (Nuevo, Como nuevo, Buen estado, Usado) lo declara su donante. Sitisbooks no inspecciona cada ejemplar en detalle.</li>
          <li>Si recibes un libro distinto al pedido, incompleto o en un estado claramente peor al declarado, avísanos dentro de las 48 horas siguientes a la entrega, con fotos. Evaluaremos el caso y, si corresponde, te devolveremos el crédito y aplicaremos medidas al donante.</li>
          <li>Los libros usados pueden tener señales normales de uso (subrayados leves, desgaste en la tapa, nombres escritos) que no se consideran defectos si coinciden con el estado declarado.</li>
        </ol></section>

      <section><h2 id="conducta">8. Conductas prohibidas</h2>
        <ul>
          <li>Subir comprobantes de pago falsos, alterados o de operaciones ajenas.</li>
          <li>Crear varias cuentas, usar identidades ajenas o registrar datos falsos.</li>
          <li>Intentar contactar a otros usuarios fuera de la plataforma, o acordar intercambios por fuera para evitar el delivery o la comisión.</li>
          <li>Publicar libros que no tienes, copias no autorizadas o libros de dudosa procedencia.</li>
          <li>Pedir libros con el fin de revenderlos de forma comercial.</li>
          <li>Tratar con insultos, amenazas o acoso al personal de Sitisbooks o a los repartidores.</li>
          <li>Usar robots, extraer datos de la plataforma o intentar vulnerar su seguridad.</li>
          <li>Cualquier uso de la plataforma contrario a la ley, la moral o el orden público.</li>
        </ul></section>

      <section><h2 id="suspension">9. Suspensión de cuentas</h2>
        <ol>
          <li>Sitisbooks puede suspender temporal o definitivamente una cuenta que incumpla estos términos, en especial el compromiso de entrega y las conductas prohibidas.</li>
          <li>Una cuenta suspendida no puede publicar, pedir libros ni comprar créditos. Sus libros publicados se retiran del catálogo y sus créditos disponibles se pierden.</li>
          <li>Los intercambios en curso de una cuenta suspendida serán cerrados por Sitisbooks de la forma que proteja mejor a la otra persona involucrada.</li>
          <li>Si crees que tu cuenta fue suspendida por error, escríbenos a {CONTACT}.</li>
        </ol></section>

      <section><h2 id="responsabilidad">10. Limitación de responsabilidad</h2>
        <ol>
          <li>Sitisbooks es un intermediario que facilita el intercambio. No es responsable por el uso indebido que los usuarios hagan de la plataforma, por la veracidad de lo que publican ni por el contenido de los libros.</li>
          <li>Cada usuario responde por los daños que cause por incumplir estos términos o la ley, incluidos los reclamos de terceros por libros de procedencia ilícita o copias no autorizadas.</li>
          <li>Sitisbooks no garantiza que la plataforma funcione sin interrupciones o errores, ni la disponibilidad permanente de un libro en el catálogo.</li>
          <li>En los casos en que Sitisbooks deba responder, su responsabilidad se limita al monto pagado por el intercambio afectado, salvo dolo o culpa inexcusable, y sin perjuicio de los derechos que la ley reconoce a los consumidores.</li>
        </ol></section>

      <section><h2 id="propiedad">11. Propiedad intelectual</h2>
        <p>La marca, el logo, el diseño y el software de Sitisbooks le pertenecen. Las portadas de libros que se muestran pertenecen a sus respectivos titulares y se usan solo para identificar cada ejemplar. Si eres titular de derechos y consideras que algún contenido te afecta, escríbenos a {CONTACT}.</p></section>

      <section><h2 id="privacidad">12. Política de privacidad</h2>
        <p>Tratamos tus datos personales conforme a la Ley N.º 29733, Ley de Protección de Datos Personales, y su Reglamento aprobado por Decreto Supremo N.º 016-2024-JUS.</p>
        <ol>
          <li><b>Responsable:</b> Sitisbooks, contacto {CONTACT}. Banco de datos “Usuarios de Sitisbooks”, inscrito en el Registro Nacional de Protección de Datos Personales con código [N.º DE REGISTRO].</li>
          <li><b>Datos que recogemos:</b> correo, nombres y apellidos, celular, direcciones de recojo y entrega (y su ubicación en el mapa, si la marcas), comprobantes de pago, libros publicados e historial de intercambios.</li>
          <li><b>Para qué los usamos:</b> crear y gestionar tu cuenta; coordinar recojos y entregas; calcular el delivery; validar pagos; prevenir fraudes y hacer cumplir estos términos; y atender tus consultas y reclamos.</li>
          <li><b>Quién los ve:</b> solo el equipo de Sitisbooks y, cuando sea necesario para el recojo o la entrega, el repartidor asignado. Otros usuarios nunca ven tus datos. No vendemos tus datos.</li>
          <li><b>Proveedores:</b> para operar usamos servicios de alojamiento, base de datos y envío de correos de terceros (Vercel, Supabase y Brevo), que pueden almacenar datos fuera del Perú con medidas de seguridad adecuadas. Al aceptar esta política consientes esa transferencia.</li>
          <li><b>Cuánto tiempo:</b> mientras tu cuenta esté activa y, luego, el tiempo necesario para cumplir obligaciones legales o atender reclamos.</li>
          <li><b>Tus derechos:</b> puedes ejercer tus derechos de acceso, rectificación, cancelación, oposición y portabilidad escribiendo a {CONTACT}. Si no recibes respuesta, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.</li>
          <li><b>Seguridad:</b> aplicamos medidas técnicas y organizativas para proteger tus datos, como el acceso restringido por usuario y el cifrado en tránsito.</li>
        </ol></section>

      <section><h2 id="reclamos">13. Atención de reclamos</h2>
        <p>Puedes enviarnos consultas o reclamos a {CONTACT}. Conforme al Código de Protección y Defensa del Consumidor, Sitisbooks pone a tu disposición un Libro de Reclamaciones virtual: [ENLACE AL LIBRO DE RECLAMACIONES].</p></section>

      <section><h2 id="cambios">14. Cambios a estos términos</h2>
        <p>Podemos actualizar estos términos. Cuando el cambio sea relevante, te pediremos aceptarlos de nuevo al ingresar. La fecha de la última actualización figura al inicio.</p></section>

      <section><h2 id="ley">15. Ley aplicable</h2>
        <p>Estos términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los jueces y tribunales de Lima, sin perjuicio de los derechos que la ley reconoce a los consumidores y de su derecho a acudir al Indecopi.</p></section>

      <p><Link href="/">← Volver al catálogo</Link></p>
    </article>
  );
}
